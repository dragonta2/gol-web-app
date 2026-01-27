import { describe, it, expect } from 'vitest';
import {
  validateStringLength,
  validateNumberRange,
  validateInteger,
  validateJournalText,
  validateHabitName,
  validateTaskName,
  validateHabitType,
  validateTodoStatus,
  validateAll,
} from '../validation';

describe('validation utilities', () => {
  describe('validateStringLength', () => {
    it('validates string length correctly', () => {
      expect(validateStringLength('test', 'field', 10, 1).valid).toBe(true);
      expect(validateStringLength('', 'field', 10, 1).valid).toBe(false);
      expect(validateStringLength(null, 'field', 10, 1).valid).toBe(true); // optional
      expect(validateStringLength(undefined, 'field', 10, 1).valid).toBe(true); // optional
      expect(validateStringLength('too long string', 'field', 10, 1).valid).toBe(false);
    });
  });

  describe('validateNumberRange', () => {
    it('validates number range correctly', () => {
      expect(validateNumberRange(10, 'field', 0, 100).valid).toBe(true);
      expect(validateNumberRange(-1, 'field', 0, 100).valid).toBe(false);
      expect(validateNumberRange(101, 'field', 0, 100).valid).toBe(false);
      expect(validateNumberRange(null, 'field', 0, 100, false).valid).toBe(true); // optional
      expect(validateNumberRange(null, 'field', 0, 100, true).valid).toBe(false); // required
    });
  });

  describe('validateInteger', () => {
    it('validates integer correctly', () => {
      expect(validateInteger(10, 'field').valid).toBe(true);
      expect(validateInteger(10.5, 'field').valid).toBe(false);
      expect(validateInteger(null, 'field', false).valid).toBe(true); // optional
    });
  });

  describe('validateJournalText', () => {
    it('validates journal text correctly', () => {
      expect(validateJournalText('test').valid).toBe(true);
      expect(validateJournalText('a'.repeat(3001)).valid).toBe(false);
      expect(validateJournalText(null).valid).toBe(true); // optional
    });
  });

  describe('validateHabitName', () => {
    it('validates habit name correctly', () => {
      expect(validateHabitName('test').valid).toBe(true);
      expect(validateHabitName('').valid).toBe(false);
      expect(validateHabitName(null).valid).toBe(false); // required
      expect(validateHabitName('a'.repeat(101)).valid).toBe(false);
    });
  });

  describe('validateTaskName', () => {
    it('validates task name correctly', () => {
      expect(validateTaskName('test').valid).toBe(true);
      expect(validateTaskName('').valid).toBe(false);
      expect(validateTaskName(null).valid).toBe(false); // required
      expect(validateTaskName('a'.repeat(201)).valid).toBe(false);
    });
  });

  describe('validateHabitType', () => {
    it('validates habit type correctly', () => {
      expect(validateHabitType('good').valid).toBe(true);
      expect(validateHabitType('bad').valid).toBe(true);
      expect(validateHabitType('bonus').valid).toBe(true);
      expect(validateHabitType('invalid').valid).toBe(false);
      expect(validateHabitType(null).valid).toBe(false);
    });
  });

  describe('validateTodoStatus', () => {
    it('validates todo status correctly', () => {
      expect(validateTodoStatus('active').valid).toBe(true);
      expect(validateTodoStatus('in_progress').valid).toBe(true);
      expect(validateTodoStatus('completed').valid).toBe(true);
      expect(validateTodoStatus('invalid').valid).toBe(false);
      expect(validateTodoStatus(null).valid).toBe(false);
    });
  });

  describe('validateAll', () => {
    it('validates all validations correctly', () => {
      const result1 = validateAll([
        { valid: true },
        { valid: true },
      ]);
      expect(result1.valid).toBe(true);
      expect(result1.errors).toHaveLength(0);

      const result2 = validateAll([
        { valid: true },
        { valid: false, error: 'Error 1' },
        { valid: false, error: 'Error 2' },
      ]);
      expect(result2.valid).toBe(false);
      expect(result2.errors).toHaveLength(2);
      expect(result2.errors).toContain('Error 1');
      expect(result2.errors).toContain('Error 2');
    });
  });
});
