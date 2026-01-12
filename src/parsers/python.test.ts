/**
 * Unit tests for Python parser
 */

import { PythonParser } from './python';

describe('PythonParser', () => {
  const parser = new PythonParser();

  describe('parse()', () => {
    it('should parse simple imports', () => {
      const content = `
import os
import sys
import logging
      `;
      const result = parser.parse(content, '/test/file.py', '/test');

      expect(result.imports).toHaveLength(3);
      expect(result.imports[0].source).toBe('os');
      expect(result.imports[0].type).toBe('python-import');
    });

    it('should parse from imports', () => {
      const content = `from typing import Optional, List`;
      const result = parser.parse(content, '/test/file.py', '/test');

      expect(result.imports).toHaveLength(1);
      expect(result.imports[0].source).toBe('typing');
      expect(result.imports[0].type).toBe('python-from');
      expect(result.imports[0].names).toContain('Optional');
      expect(result.imports[0].names).toContain('List');
    });

    it('should parse relative imports', () => {
      const content = `
from . import utils
from .models import User
from ..shared import database
from ...core import config
      `;
      const result = parser.parse(content, '/test/services/file.py', '/test');

      expect(result.imports).toHaveLength(4);
      expect(result.imports[0].isRelative).toBe(true);
      expect(result.imports[1].isRelative).toBe(true);
      expect(result.imports[2].isRelative).toBe(true);
      expect(result.imports[3].isRelative).toBe(true);
    });

    it('should parse aliased imports', () => {
      const content = `
import numpy as np
import pandas as pd
from datetime import datetime as dt
      `;
      const result = parser.parse(content, '/test/file.py', '/test');

      expect(result.imports).toHaveLength(3);
      expect(result.imports[0].source).toBe('numpy');
      expect(result.imports[1].source).toBe('pandas');
    });

    it('should parse multi-line imports', () => {
      const content = `
from typing import (
    Optional,
    List,
    Dict,
    Union
)
      `;
      const result = parser.parse(content, '/test/file.py', '/test');

      expect(result.imports).toHaveLength(1);
      expect(result.imports[0].names?.length).toBeGreaterThanOrEqual(4);
    });

    it('should extract exports from __all__', () => {
      const content = `
__all__ = ['User', 'UserService', 'create_user']

class User:
    pass

class UserService:
    pass

def create_user():
    pass
      `;
      const result = parser.parse(content, '/test/file.py', '/test');

      expect(result.exports).toContain('User');
      expect(result.exports).toContain('UserService');
      expect(result.exports).toContain('create_user');
    });

    it('should detect external vs internal imports', () => {
      const content = `
import os
from .local import helper
from requests import get
      `;
      const result = parser.parse(content, '/test/file.py', '/test');

      expect(result.imports[0].isRelative).toBe(false);
      expect(result.imports[1].isRelative).toBe(true);
      expect(result.imports[2].isRelative).toBe(false);
    });

    it('should handle empty files', () => {
      const result = parser.parse('', '/test/empty.py', '/test');

      expect(result.imports).toHaveLength(0);
      expect(result.exports).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle files with only comments', () => {
      const content = `
# This is a comment
# Another comment
"""
Docstring
"""
      `;
      const result = parser.parse(content, '/test/file.py', '/test');

      expect(result.imports).toHaveLength(0);
    });
  });

  describe('supports()', () => {
    it('should support Python files', () => {
      expect(parser.canParse('file.py')).toBe(true);
      expect(parser.canParse('module.py')).toBe(true);
    });

    it('should not support other files', () => {
      expect(parser.canParse('file.js')).toBe(false);
      expect(parser.canParse('file.ts')).toBe(false);
      // .pyw is a valid Python extension, so it returns true
      expect(parser.canParse('file.pyw')).toBe(true);
    });
  });
});
