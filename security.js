/**
 * Funções de segurança para evitar XSS e outras vulnerabilidades
 */

/**
 * Escapa caracteres HTML especiais para evitar XSS
 * @param {string} text - Texto a ser escapado
 * @returns {string} Texto escapado
 */
export function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Valida arquivo para upload
 * @param {File} file - Arquivo a validar
 * @returns {Object} { valid: boolean, error: string }
 */
export function validateFile(file) {
  const config = {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    ALLOWED_EXTENSIONS: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx']
  };

  if (file.size > config.MAX_SIZE) {
    return { valid: false, error: `${file.name} - arquivo muito grande (máx 5MB)` };
  }

  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (!config.ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `${file.name} - extensão não permitida` };
  }

  if (file.type && !config.ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: `${file.name} - tipo MIME não permitido` };
  }

  return { valid: true, error: null };
}
