/**
 * O mesmo caminho é usado em desenvolvimento e produção.
 * Em dev, o Angular CLI encaminha /api para o Spring Boot pela configuração proxy.conf.json.
 * Em produção, o servidor web deve encaminhar /api removendo esse prefixo.
 */
export const API_BASE_URL = '/api';
