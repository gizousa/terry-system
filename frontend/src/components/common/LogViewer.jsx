// Componente para visualização de logs em tempo real
import React, { useRef, useEffect } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Chip } from '@mui/material';
import { Info, Warning, Error as ErrorIcon, CheckCircle } from '@mui/icons-material';
import { formatDateTime } from '../../utils/dateUtils';

const LogViewer = ({ logs = [], maxHeight = '400px', autoScroll = true }) => {
  // Referência para auto-rolagem
  const logsEndRef = useRef(null);
  
  // Auto-rolagem para o final dos logs quando novos logs são adicionados
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);
  
  // Renderizar chip de nível de log
  const renderLogLevelChip = (level) => {
    switch (level) {
      case 'info':
        return <Chip size="small" icon={<Info />} label="Info" color="primary" />;
      case 'warning':
        return <Chip size="small" icon={<Warning />} label="Aviso" color="warning" />;
      case 'error':
        return <Chip size="small" icon={<ErrorIcon />} label="Erro" color="error" />;
      case 'success':
        return <Chip size="small" icon={<CheckCircle />} label="Sucesso" color="success" />;
      default:
        return <Chip size="small" label={level} />;
    }
  };
  
  return (
    <Paper variant="outlined" sx={{ p: 1, maxHeight, overflow: 'auto' }}>
      <Typography variant="subtitle2" gutterBottom>
        Logs
      </Typography>
      
      <List dense>
        {logs.length === 0 ? (
          <ListItem>
            <ListItemText primary="Nenhum log disponível" />
          </ListItem>
        ) : (
          logs.map((log, index) => (
            <ListItem key={index}>
              <ListItemText 
                primary={
                  <Box display="flex" alignItems="center">
                    {renderLogLevelChip(log.level)}
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      {log.message}
                    </Typography>
                  </Box>
                }
                secondary={formatDateTime(log.timestamp)}
              />
            </ListItem>
          ))
        )}
        <div ref={logsEndRef} />
      </List>
    </Paper>
  );
};

export default LogViewer;
