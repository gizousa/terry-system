// Componente para exibir o status de uma sessão
import React from 'react';
import { Box, Typography, LinearProgress, Card, CardContent } from '@mui/material';
import { PlayArrow, Stop, CheckCircle, Error as ErrorIcon, HourglassEmpty } from '@mui/icons-material';

const ProgressCard = ({ title, value = 0, status, currentStep }) => {
  // Determinar cor com base no status
  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'primary';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'starting':
        return 'info';
      default:
        return 'primary';
    }
  };
  
  // Renderizar ícone com base no status
  const renderStatusIcon = () => {
    switch (status) {
      case 'running':
        return <PlayArrow color="primary" />;
      case 'completed':
        return <CheckCircle color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'starting':
        return <HourglassEmpty color="info" />;
      case 'stopped':
        return <Stop color="warning" />;
      default:
        return null;
    }
  };
  
  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="subtitle2" color="textSecondary">
            {title}
          </Typography>
          {renderStatusIcon()}
        </Box>
        
        <LinearProgress 
          variant="determinate" 
          value={value} 
          color={getStatusColor()}
          sx={{ height: 10, borderRadius: 5 }}
        />
        
        <Box display="flex" justifyContent="space-between" mt={1}>
          <Typography variant="body2" color="textSecondary">
            {value}%
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {status === 'completed' ? 'Concluído' : 
             status === 'failed' ? 'Falhou' :
             status === 'running' ? 'Em execução' :
             status === 'starting' ? 'Iniciando' :
             status === 'stopped' ? 'Interrompido' : 'Desconhecido'}
          </Typography>
        </Box>
        
        {currentStep && (
          <Typography variant="body2" mt={1}>
            <strong>Etapa atual:</strong> {currentStep}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default ProgressCard;
