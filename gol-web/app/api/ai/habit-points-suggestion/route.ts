/**
 * 習慣のポイント・EXPをAIで提案するAPI
 * 習慣名と種類（良習慣/悪習慣/ボーナス）から適切な値を返す
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getOpenAIClient } from "@/lib/ai/openai"

const HABIT_NAME_MAX = 200

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const body = await request.json()
    const habitName =
      typeof body.habit_name === "string" ? body.habit_name.trim() : ""
    const habitType =
      body.habit_type === "good" ||
      body.habit_type === "bad" ||
      body.habit_type === "bonus"
        ? body.habit_type
        : "good"

    if (!habitName) {
      return NextResponse.json(
        { error: "習慣名を入力してください" },
        { status: 400 },
      )
    }
    if (habitName.length > HABIT_NAME_MAX) {
      return NextResponse.json(
        { error: `習慣名は${HABIT_NAME_MAX}文字以内で入力してください` },
        { status: 400 },
      )
    }

    const openai = getOpenAIClient()
    if (!openai) {
      return NextResponse.json(
        { error: "AI機能を利用できません。設定を確認してください。" },
        { status: 503 },
      )
    }

    // 良習慣: ゴルド+1、EXPは身体・頭脳・精神のどれか1つ+1。悪習慣: ゴルド-1、EXPはどれか1つ-1（DB上は1で保存しアプリ側で減点）。ボーナス: ポイントのみ簡易対応。
    if (habitType === "bonus") {
      return NextResponse.json({
        points: 5,
        exp_body: 0,
        exp_mind: 0,
        exp_spirit: 0,
      })
    }

    const typeLabel =
      habitType === "good"
        ? "良習慣（ゴルド+1、EXPは身体・頭脳・精神のどれか1つ+1）"
        : "悪習慣（ゴルド-1、EXPは身体・頭脳・精神のどれか1つ-1）"

    const systemPrompt = `あなたは習慣の種類を判断するだけです。
ユーザーが入力した習慣名から、次のどれに当てはまるか1つだけ選んでください。
- body: 身体（筋トレ、ランニング、運動、睡眠など体に関わる習慣）
- mind: 頭脳（読書、勉強、学習、仕事など頭を使う習慣）
- spirit: 精神（瞑想、日記、感謝など心・精神に関わる習慣）

習慣名から判断できない・とても判断がつかない場合は、body / mind / spirit のいずれかをランダムに選んでよい。

必ずJSONのみを返す。説明文は不要。
返却形式: {"exp_target": "body" または "mind" または "spirit"}`

    const userPrompt = `習慣名: ${habitName}
種類: ${typeLabel}

この習慣名に最もふさわしい exp_target を1つだけ返してください。`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { error: "AIの応答を取得できませんでした" },
        { status: 500 },
      )
    }

    let parsed: { exp_target?: string }
    try {
      parsed = JSON.parse(content) as typeof parsed
    } catch {
      return NextResponse.json(
        { error: "AIの応答の形式が不正でした" },
        { status: 500 },
      )
    }

    const target =
      parsed.exp_target === "body"
        ? "body"
        : parsed.exp_target === "mind"
          ? "mind"
          : parsed.exp_target === "spirit"
            ? "spirit"
            : "body"

    const points = 1
    const exp_body = target === "body" ? 1 : 0
    const exp_mind = target === "mind" ? 1 : 0
    const exp_spirit = target === "spirit" ? 1 : 0

    return NextResponse.json({
      points,
      exp_body,
      exp_mind,
      exp_spirit,
    })
  } catch (err) {
    console.error("habit-points-suggestion error:", err)
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "提案の取得に失敗しました",
      },
      { status: 500 },
    )
  }
}
