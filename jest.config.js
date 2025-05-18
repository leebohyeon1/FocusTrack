/**
 * Jest configuration file for FocusTrack
 */

module.exports = {
  // 테스트 환경 설정
  testEnvironment: 'jsdom',
  
  // 테스트 파일 패턴 설정
  testMatch: [
    '**/__tests__/**/*.js',
    '**/test/**/*.test.js',
    '**/*.test.js',
    '**/*.spec.js'
  ],
  
  // 테스트 무시 패턴
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/',
    '/coverage/',
    '/.temp-test-data/'
  ],
  
  // 코드 커버리지 설정
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.d.ts',
    '!src/index.js',
    '!src/preload.js',
    '!src/**/*/index.js',
    '!**/node_modules/**'
  ],
  
  // 커버리지 임계값 설정
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    }
  },
  
  // 모듈 경로 매핑
  moduleNameMapper: {
    // 이미지, 스타일 등 정적 파일 모킹
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
    
    // 절대 경로 매핑
    '^src/(.*)$': '<rootDir>/src/$1',
    '^test/(.*)$': '<rootDir>/test/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@main/(.*)$': '<rootDir>/src/main/$1',
    '^@renderer/(.*)$': '<rootDir>/src/renderer/$1',
    '^@utils/(.*)$': '<rootDir>/src/shared/utils/$1',
    '^@test-utils/(.*)$': '<rootDir>/test/utils/$1',
    '^@test-utils$': '<rootDir>/test/utils'
  },
  
  // 테스트 셋업 파일
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ],
  
  // 코드 변환 설정
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  
  // 변환 제외 패턴
  transformIgnorePatterns: [
    '/node_modules/(?![@electron])',
  ],
  
  // 테스트 환경 변수
  testEnvironmentOptions: {
    url: 'http://localhost/'
  },
  
  // 글로벌 변수 설정
  globals: {
    'electron': true
  },
  
  // 각 테스트 파일 실행 후 설정 초기화
  resetMocks: true,
  
  // 정확한 호출 검증 (좀더 엄격한 테스트)
  restoreMocks: true,
  
  // 모듈 모킹 리셋
  resetModules: true,
  
  // 타임아웃 설정 (밀리초)
  testTimeout: 10000,
  
  // 테스트 결과 보고 형식
  verbose: true,
  
  // 병렬 실행 워커 수
  maxWorkers: '50%'
};