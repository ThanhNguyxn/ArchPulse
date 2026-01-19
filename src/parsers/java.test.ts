/**
 * Unit tests for Java parser
 */

import { JavaParser } from './java';

describe('JavaParser', () => {
  const parser = new JavaParser();

  describe('parse()', () => {
    it('should parse standard imports', () => {
      const content = `
        package com.example.app;

        import java.util.List;
        import java.util.Map;
        import java.util.ArrayList;
      `;
      const result = parser.parse(content, '/test/App.java', '/test');

      expect(result.imports).toHaveLength(3);
      expect(result.imports[0].source).toBe('java.util.List');
      expect(result.imports[0].type).toBe('java-import');
      expect(result.imports[0].names).toContain('List');
    });

    it('should parse wildcard imports', () => {
      const content = `
        package com.example.app;

        import java.util.*;
        import com.example.models.*;
      `;
      const result = parser.parse(content, '/test/App.java', '/test');

      expect(result.imports).toHaveLength(2);
      expect(result.imports[0].source).toBe('java.util');
      expect(result.imports[0].names).toContain('*');
      expect(result.imports[1].source).toBe('com.example.models');
    });

    it('should parse static imports', () => {
      const content = `
        package com.example.app;

        import static java.lang.Math.PI;
        import static java.util.Collections.*;
      `;
      const result = parser.parse(content, '/test/App.java', '/test');

      expect(result.imports).toHaveLength(2);
      expect(result.imports[0].source).toBe('java.lang.Math.PI');
    });

    it('should detect external vs internal imports', () => {
      const content = `
        package com.example.app;

        import java.util.List;
        import javax.servlet.http.HttpServlet;
        import com.example.service.UserService;
        import org.springframework.boot.SpringApplication;
      `;
      const result = parser.parse(content, '/test/App.java', '/test');

      expect(result.imports[0].isExternal).toBe(true); // java.util
      expect(result.imports[1].isExternal).toBe(true); // javax.servlet
      expect(result.imports[2].isExternal).toBe(false); // com.example (same root)
      expect(result.imports[3].isExternal).toBe(true); // org.springframework
    });

    it('should extract exported classes', () => {
      const content = `
        package com.example.app;

        public class UserController {
          private String name;
        }

        public interface UserRepository {
        }

        public enum Status {
          ACTIVE, INACTIVE
        }
      `;
      const result = parser.parse(content, '/test/UserController.java', '/test');

      expect(result.exports).toContain('UserController');
      expect(result.exports).toContain('UserRepository');
      expect(result.exports).toContain('Status');
    });

    it('should extract abstract classes', () => {
      const content = `
        package com.example.app;

        public abstract class BaseService {
          public abstract void execute();
        }
      `;
      const result = parser.parse(content, '/test/BaseService.java', '/test');

      expect(result.exports).toContain('BaseService');
    });

    it('should handle files without package declaration', () => {
      const content = `
        import java.util.List;

        public class Test {
        }
      `;
      const result = parser.parse(content, '/test/Test.java', '/test');

      expect(result.imports).toHaveLength(1);
      expect(result.imports[0].isExternal).toBe(true);
    });

    it('should handle empty files', () => {
      const content = '';
      const result = parser.parse(content, '/test/Empty.java', '/test');

      expect(result.imports).toHaveLength(0);
      expect(result.exports).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should track line numbers', () => {
      const content = `package com.example;
import java.util.List;
import java.util.Map;
public class Test {}
`;
      const result = parser.parse(content, '/test/Test.java', '/test');

      expect(result.imports[0].line).toBe(2);
      expect(result.imports[1].line).toBe(3);
    });

    it('should set correct file metadata', () => {
      const content = `package com.example; public class Test {}`;
      const result = parser.parse(content, '/project/src/Test.java', '/project');

      expect(result.filePath).toBe('/project/src/Test.java');
      expect(result.relativePath).toBe('src/Test.java');
      expect(result.size).toBe(content.length);
    });
  });

  describe('canParse()', () => {
    it('should support Java files', () => {
      expect(parser.canParse('Test.java')).toBe(true);
      expect(parser.canParse('path/to/Service.java')).toBe(true);
    });

    it('should not support other files', () => {
      expect(parser.canParse('file.ts')).toBe(false);
      expect(parser.canParse('file.py')).toBe(false);
      expect(parser.canParse('file.go')).toBe(false);
      expect(parser.canParse('file.class')).toBe(false);
      expect(parser.canParse('file.jar')).toBe(false);
    });
  });
});
