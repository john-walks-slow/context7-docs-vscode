import { describe, it, expect } from 'vitest'
import { extractLibraryFromPath } from '../src/constants/languagePaths'

describe('languagePaths', () => {
  describe('JavaScript/TypeScript/Vue', () => {
    const languages = [
      'javascript',
      'typescript',
      'javascriptreact',
      'typescriptreact',
      'vue',
    ]

    describe('npm/yarn1/pnpm/yarn-cache (通用匹配)', () => {
      it.each(languages)(
        'should extract library from npm node_modules (%s)',
        (lang) => {
          expect(
            extractLibraryFromPath(
              '/project/node_modules/lodash/index.js',
              lang,
            ),
          ).toBe('lodash')
          expect(
            extractLibraryFromPath(
              '/project/node_modules/react/index.js',
              lang,
            ),
          ).toBe('react')
        },
      )

      it.each(languages)('should extract scoped package (%s)', (lang) => {
        // @types/react 应该返回 react（去除 @types/ 前缀）
        expect(
          extractLibraryFromPath(
            '/project/node_modules/@types/react/index.d.ts',
            lang,
          ),
        ).toBe('react')
        expect(
          extractLibraryFromPath(
            '/project/node_modules/@babel/core/index.js',
            lang,
          ),
        ).toBe('@babel/core')
      })

      it.each(languages)('should extract from pnpm store (%s)', (lang) => {
        expect(
          extractLibraryFromPath(
            '/project/node_modules/.pnpm/lodash@4.17.21/node_modules/lodash/index.js',
            lang,
          ),
        ).toBe('lodash')
        // @types/react 应该返回 react（去除 @types/ 前缀）
        expect(
          extractLibraryFromPath(
            '/project/node_modules/.pnpm/@types+react@18.2.0/node_modules/@types/react/index.d.ts',
            lang,
          ),
        ).toBe('react')
      })

      it.each(languages)('should extract from yarn cache (%s)', (lang) => {
        expect(
          extractLibraryFromPath(
            '/project/.yarn/cache/lodash-npm-4.17.21.zip/node_modules/lodash/index.js',
            lang,
          ),
        ).toBe('lodash')
        expect(
          extractLibraryFromPath(
            '/project/.yarn/unplugged/react-npm-18.2.0/node_modules/react/index.js',
            lang,
          ),
        ).toBe('react')
      })

      it.each(languages)('should handle Windows paths (%s)', (lang) => {
        expect(
          extractLibraryFromPath(
            'C:\\project\\node_modules\\lodash\\index.js',
            lang,
          ),
        ).toBe('lodash')
        expect(
          extractLibraryFromPath(
            'C:\\project\\node_modules\\.pnpm\\lodash@4.17.21\\node_modules\\lodash\\index.js',
            lang,
          ),
        ).toBe('lodash')
      })
    })
  })

  describe('Python', () => {
    it('should extract library from site-packages', () => {
      expect(
        extractLibraryFromPath(
          '/home/user/.local/lib/python3.11/site-packages/requests/__init__.py',
          'python',
        ),
      ).toBe('requests')
      expect(
        extractLibraryFromPath(
          '/project/.venv/lib/python3.11/site-packages/pytest/__init__.py',
          'python',
        ),
      ).toBe('pytest')
    })
  })

  describe('Go', () => {
    it('should extract module from pkg/mod', () => {
      expect(
        extractLibraryFromPath(
          '/home/user/go/pkg/mod/github.com/gin-gonic/gin@v1.9.0/context.go',
          'go',
        ),
      ).toBe('github.com/gin-gonic/gin')
      expect(
        extractLibraryFromPath(
          '/home/user/go/pkg/mod/golang.org/x/tools@v0.10.0/go/packages.go',
          'go',
        ),
      ).toBe('golang.org/x/tools')
    })
  })

  describe('Rust', () => {
    it('should extract crate name', () => {
      expect(
        extractLibraryFromPath(
          '/home/user/.cargo/registry/src/github.com-1ecc6299db9ec823/serde-1.0.190/src/lib.rs',
          'rust',
        ),
      ).toBe('serde')
      expect(
        extractLibraryFromPath(
          '/home/user/.cargo/registry/src/github.com-1ecc6299db9ec823/actix-web-4.3.1/src/lib.rs',
          'rust',
        ),
      ).toBe('actix-web')
      expect(
        extractLibraryFromPath(
          '/home/user/.cargo/registry/src/github.com-1ecc6299db9ec823/winapi-x86_64-pc-windows-gnu-0.4.0/src/lib.rs',
          'rust',
        ),
      ).toBe('winapi-x86_64-pc-windows-gnu')
    })
  })

  describe('Java', () => {
    it('should extract from Maven repository', () => {
      expect(
        extractLibraryFromPath(
          '/home/user/.m2/repository/org/apache/maven/maven-core/3.9.0/maven-core-3.9.0.jar',
          'java',
        ),
      ).toBe('org/apache/maven/maven-core')
    })

    it('should extract from Gradle cache', () => {
      expect(
        extractLibraryFromPath(
          '/home/user/.gradle/caches/modules-2/files-2.1/org.springframework/spring-core/6.0.0/abc123/spring-core-6.0.0.jar',
          'java',
        ),
      ).toBe('org.springframework/spring-core')
    })
  })

  describe('C#', () => {
    it('should extract from NuGet packages', () => {
      expect(
        extractLibraryFromPath(
          '/home/user/.nuget/packages/newtonsoft.json/13.0.3/lib/net6.0/Newtonsoft.Json.dll',
          'csharp',
        ),
      ).toBe('newtonsoft.json')
      expect(
        extractLibraryFromPath(
          '/project/packages/Newtonsoft.Json.13.0.3/lib/net6.0/Newtonsoft.Json.dll',
          'csharp',
        ),
      ).toBe('Newtonsoft.Json.13.0.3')
    })
  })

  describe('Ruby', () => {
    it('should extract gem name', () => {
      expect(
        extractLibraryFromPath(
          '/home/user/.rbenv/versions/3.2.0/lib/ruby/gems/3.2.0/gems/rails-7.0.5/lib/rails.rb',
          'ruby',
        ),
      ).toBe('rails')
      expect(
        extractLibraryFromPath(
          '/home/user/.rvm/gems/ruby-3.2.0/gems/rspec-rails-6.0.0/lib/rspec-rails.rb',
          'ruby',
        ),
      ).toBe('rspec-rails')
      expect(
        extractLibraryFromPath(
          '/home/user/.gem/ruby/3.2.0/gems/bundler-2.4.0/lib/bundler.rb',
          'ruby',
        ),
      ).toBe('bundler')
    })
  })

  describe('PHP', () => {
    it('should extract from vendor path', () => {
      expect(
        extractLibraryFromPath(
          '/project/vendor/guzzlehttp/guzzle/src/Client.php',
          'php',
        ),
      ).toBe('guzzlehttp/guzzle')
      expect(
        extractLibraryFromPath(
          '/project/vendor/laravel/framework/src/Illuminate/Foundation/Application.php',
          'php',
        ),
      ).toBe('laravel/framework')
    })
  })

  describe('Dart/Flutter', () => {
    it('should extract from pub-cache', () => {
      expect(
        extractLibraryFromPath(
          '/home/user/.pub-cache/hosted/pub.dev/http-1.1.0/lib/http.dart',
          'dart',
        ),
      ).toBe('http')
      expect(
        extractLibraryFromPath(
          'C:\\Users\\user\\AppData\\Local\\Pub\\Cache\\hosted\\pub.dev\\http-1.1.0\\lib\\http.dart',
          'dart',
        ),
      ).toBe('http')
    })
  })

  describe('Language filtering', () => {
    it('should only match patterns for specified language', () => {
      expect(
        extractLibraryFromPath(
          '/home/user/.local/lib/python3.11/site-packages/requests/__init__.py',
          'typescript',
        ),
      ).toBeNull()
      expect(
        extractLibraryFromPath(
          '/project/node_modules/lodash/index.js',
          'python',
        ),
      ).toBeNull()
    })

    it('should match all patterns when no language specified', () => {
      expect(
        extractLibraryFromPath('/project/node_modules/lodash/index.js'),
      ).toBe('lodash')
      expect(
        extractLibraryFromPath(
          '/home/user/.local/lib/python3.11/site-packages/requests/__init__.py',
        ),
      ).toBe('requests')
    })
  })

  describe('Edge cases', () => {
    it('should return null for non-library paths', () => {
      expect(
        extractLibraryFromPath(
          '/home/user/my-project/src/index.ts',
          'typescript',
        ),
      ).toBeNull()
    })

    it('should handle empty string', () => {
      expect(extractLibraryFromPath('', 'typescript')).toBeNull()
    })
  })
})
