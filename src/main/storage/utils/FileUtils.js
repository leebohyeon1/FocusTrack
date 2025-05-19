class FileUtils {
  async ensureDir(dirPath) {
    // 디렉토리 존재 여부 확인 후 생성
    return true;
  }
  
  async readJsonFile(filePath, defaultValue = null) {
    // 파일 읽기
    return {};
  }
  
  async writeJsonFile(filePath, data) {
    // 파일 쓰기
    return true;
  }
  
  async fileExists(filePath) {
    // 파일 존재 여부 확인
    return true;
  }
  
  async readDir(dirPath) {
    // 디렉토리 내용 읽기
    return [];
  }
  
  async deleteFile(filePath) {
    // 파일 삭제
    return true;
  }
}

module.exports = FileUtils;
