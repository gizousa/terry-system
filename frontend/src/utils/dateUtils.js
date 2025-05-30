// Utilitários para formatação de data e hora
export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  // Verificar se a data é válida
  if (isNaN(date.getTime())) {
    return dateString;
  }
  
  // Formatar data e hora
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  // Verificar se a data é válida
  if (isNaN(date.getTime())) {
    return dateString;
  }
  
  // Formatar apenas a data
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const formatTime = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  // Verificar se a data é válida
  if (isNaN(date.getTime())) {
    return dateString;
  }
  
  // Formatar apenas a hora
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const formatDuration = (startDate, endDate) => {
  if (!startDate || !endDate) return '';
  
  // Converter para objetos Date se forem strings
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  // Verificar se as datas são válidas
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return '';
  }
  
  // Calcular diferença em milissegundos
  const diff = end.getTime() - start.getTime();
  
  // Converter para unidades de tempo
  const seconds = Math.floor(diff / 1000) % 60;
  const minutes = Math.floor(diff / (1000 * 60)) % 60;
  const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  // Formatar resultado
  let result = '';
  
  if (days > 0) {
    result += `${days}d `;
  }
  
  if (hours > 0 || days > 0) {
    result += `${hours}h `;
  }
  
  if (minutes > 0 || hours > 0 || days > 0) {
    result += `${minutes}m `;
  }
  
  result += `${seconds}s`;
  
  return result;
};

export const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  // Verificar se a data é válida
  if (isNaN(date.getTime())) {
    return dateString;
  }
  
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // Menos de 1 minuto
  if (diff < 60 * 1000) {
    return 'agora mesmo';
  }
  
  // Menos de 1 hora
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `há ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  }
  
  // Menos de 1 dia
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  }
  
  // Menos de 30 dias
  if (diff < 30 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
  }
  
  // Mais de 30 dias
  return formatDate(dateString);
};
