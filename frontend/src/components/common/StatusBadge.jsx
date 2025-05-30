// Componente para exibir badge de status
import React from 'react';
import { Chip } from '@mui/material';
import { 
  PlayArrow, 
  Stop, 
  CheckCircle, 
  Error as ErrorIcon, 
  HourglassEmpty 
} from '@mui/icons-material';

const StatusBadge = ({ status }) => {
  // Configurar propriedades com base no status
  const getStatusConfig = () => {
    switch (status) {
      case 'running':
        return {
          label: 'Em execução',
          color: 'primary',
          icon: <PlayArrow />
        };
      case 'completed':
        return {
          label: 'Concluído',
          color: 'success',
          icon: <CheckCircle />
        };
      case 'failed':
        return {
          label: 'Falhou',
          color: 'error',
          icon: <ErrorIcon />
        };
      case 'starting':
        return {
          label: 'Iniciando',
          color: 'info',
          icon: <HourglassEmpty />
        };
      case 'stopped':
        return {
          label: 'Interrompido',
          color: 'warning',
          icon: <Stop />
        };
      default:
        return {
          label: status || 'Desconhecido',
          color: 'default',
          icon: null
        };
    }
  };
  
  const config = getStatusConfig();
  
  return (
    <Chip 
      label={config.label}
      color={config.color}
      icon={config.icon}
      variant="outlined"
    />
  );
};

export default StatusBadge;
