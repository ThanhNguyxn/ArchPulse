/**
 * Unit tests for Go parser
 */

import { GoParser } from './go';

describe('GoParser', () => {
  const parser = new GoParser();

  describe('parse()', () => {
    it('should parse single imports', () => {
      const content = `
        package main

        import "fmt"
        import "os"
      `;
      const result = parser.parse(content, '/test/main.go', '/test');

      expect(result.imports).toHaveLength(2);
      expect(result.imports[0].source).toBe('fmt');
      expect(result.imports[0].type).toBe('go-import');
      expect(result.imports[1].source).toBe('os');
    });

    it('should parse import blocks', () => {
      const content = `
        package main

        import (
          "fmt"
          "os"
          "strings"
        )
      `;
      const result = parser.parse(content, '/test/main.go', '/test');

      expect(result.imports).toHaveLength(3);
      expect(result.imports[0].source).toBe('fmt');
      expect(result.imports[1].source).toBe('os');
      expect(result.imports[2].source).toBe('strings');
    });

    it('should parse aliased imports', () => {
      const content = `
        package main

        import (
          f "fmt"
          myhttp "net/http"
        )
      `;
      const result = parser.parse(content, '/test/main.go', '/test');

      expect(result.imports).toHaveLength(2);
      expect(result.imports[0].names).toContain('f');
      expect(result.imports[1].names).toContain('myhttp');
    });

    it('should parse external package imports', () => {
      const content = `
        package main

        import (
          "github.com/gin-gonic/gin"
          "github.com/go-redis/redis"
          "golang.org/x/crypto/bcrypt"
        )
      `;
      const result = parser.parse(content, '/test/main.go', '/test');

      expect(result.imports).toHaveLength(3);
      expect(result.imports[0].source).toBe('github.com/gin-gonic/gin');
      expect(result.imports[0].isExternal).toBe(true);
      expect(result.imports[1].isExternal).toBe(true);
      expect(result.imports[2].isExternal).toBe(true);
    });

    it('should parse relative imports', () => {
      const content = `
        package main

        import (
          "./internal/config"
          "../shared/utils"
        )
      `;
      const result = parser.parse(content, '/test/main.go', '/test');

      expect(result.imports).toHaveLength(2);
      expect(result.imports[0].isRelative).toBe(true);
      expect(result.imports[0].isExternal).toBe(false);
      expect(result.imports[1].isRelative).toBe(true);
    });

    it('should detect standard library imports', () => {
      const content = `
        package main

        import (
          "fmt"
          "net/http"
          "encoding/json"
          "context"
        )
      `;
      const result = parser.parse(content, '/test/main.go', '/test');

      expect(result.imports).toHaveLength(4);
      // Standard library imports should not be marked as external
      expect(result.imports[0].isExternal).toBe(false); // fmt
      expect(result.imports[1].isExternal).toBe(false); // net
      expect(result.imports[2].isExternal).toBe(false); // encoding
      expect(result.imports[3].isExternal).toBe(false); // context
    });

    it('should extract exported functions', () => {
      const content = `package main

func main() {}
func Helper() {}
func ProcessData() error { return nil }
func privateFunc() {}
`;
      const result = parser.parse(content, '/test/main.go', '/test');

      expect(result.exports).toContain('Helper');
      expect(result.exports).toContain('ProcessData');
      expect(result.exports).not.toContain('main');
      expect(result.exports).not.toContain('privateFunc');
    });

    it('should extract exported types', () => {
      const content = `package main

type User struct {
	Name string
	Age  int
}

type Handler interface {
	Handle() error
}

type privateType struct {}
`;
      const result = parser.parse(content, '/test/main.go', '/test');

      expect(result.exports).toContain('User');
      expect(result.exports).toContain('Handler');
      expect(result.exports).not.toContain('privateType');
    });

    it('should extract method receivers with exported names', () => {
      const content = `package main

func (u *User) GetName() string {
	return u.Name
}

func (u *User) setAge(age int) {
	u.Age = age
}
`;
      const result = parser.parse(content, '/test/main.go', '/test');

      expect(result.exports).toContain('GetName');
      expect(result.exports).not.toContain('setAge');
    });

    it('should handle empty files', () => {
      const content = 'package main';
      const result = parser.parse(content, '/test/main.go', '/test');

      expect(result.imports).toHaveLength(0);
      expect(result.exports).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle mixed import styles', () => {
      const content = `
        package main

        import "fmt"

        import (
          "os"
          "strings"
        )

        import "time"
      `;
      const result = parser.parse(content, '/test/main.go', '/test');

      expect(result.imports).toHaveLength(4);
      expect(result.imports.map(i => i.source)).toEqual(
        expect.arrayContaining(['fmt', 'os', 'strings', 'time'])
      );
    });

    it('should set correct file metadata', () => {
      const content = 'package main';
      const result = parser.parse(content, '/project/cmd/main.go', '/project');

      expect(result.filePath).toBe('/project/cmd/main.go');
      expect(result.relativePath).toBe('cmd/main.go');
      expect(result.size).toBe(content.length);
    });

    it('should extract module names correctly', () => {
      const content = `
        package main

        import (
          "net/http"
          "encoding/json"
        )
      `;
      const result = parser.parse(content, '/test/main.go', '/test');

      // Names should be the last part of the path
      expect(result.imports[0].names).toContain('http');
      expect(result.imports[1].names).toContain('json');
    });
  });

  describe('canParse()', () => {
    it('should support Go files', () => {
      expect(parser.canParse('main.go')).toBe(true);
      expect(parser.canParse('path/to/handler.go')).toBe(true);
      expect(parser.canParse('cmd/server/main.go')).toBe(true);
    });

    it('should not support other files', () => {
      expect(parser.canParse('file.ts')).toBe(false);
      expect(parser.canParse('file.py')).toBe(false);
      expect(parser.canParse('file.java')).toBe(false);
      expect(parser.canParse('go.mod')).toBe(false);
      expect(parser.canParse('go.sum')).toBe(false);
    });
  });
});
