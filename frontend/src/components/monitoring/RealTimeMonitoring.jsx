// Componente React para o Dashboard de Monitoramento em Tempo Real
import React, { useState, useEffect, useRef } from 'react';
import { 
  Container, Grid, Paper, Typography, Box, 
  CircularProgress, LinearProgress, Tabs, Tab, 
  List, ListItem, ListItemText, Chip, Divider,
  Button, IconButton, Card, CardContent, CardHeader
} from '@mui/material';
import { 
  PlayArrow, Stop, Refresh, Info, Warning, 
  Error as ErrorIcon, CheckCircle, Timeline,
  Visibility, Code, Terminal, Memory
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import LogViewer from '../common/LogViewer';
import StatusBadge from '../common/StatusBadge';
import TimelineChart from '../charts/TimelineChart';
import ProgressCard from '../common/ProgressCard';
import { formatDateTime, formatDuration } from '../../utils/dateUtils';

const RealTimeMonitoring = () => {
  const { user, token } = useAuth();
  const { connect, disconnect, subscribe, unsubscribe, sendMessage } = useWebSocket();
  
  const [activeTab, setActiveTab] = useState(0);
  const [activeSessions, setActiveSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [sessionLogs, setSessionLogs] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Referência para auto-rolagem de logs
  const logsEndRef = useRef(null);
  
  // Conectar ao WebSocket ao montar o componente
  useEffect(() => {
    const connectToWebSocket = async () => {
      try {
        setIsLoading(true);
        
        // Conectar ao WebSocket
        await connect(`/api/ws?token=${token}`);
        
        // Inscrever-se em tópicos relevantes
        if (user.role === 'super_admin') {
          await subscribe('system', {});
        }
        
        // Inscrever-se em automações da organização do usuário
        await subscribe('automation', { organizationId: user.organizationId });
        
        setIsLoading(false);
      } catch (err) {
        setError('Falha ao conectar ao servidor de monitoramento em tempo real');
        setIsLoading(false);
        console.error('Erro ao conectar ao WebSocket:', err);
      }
    };
    
    connectToWebSocket();
    
    // Limpar ao desmontar
    return () => {
      disconnect();
    };
  }, []);
  
  // Manipular eventos recebidos do WebSocket
  useEffect(() => {
    const handleWebSocketEvent = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'event':
          handleEvent(data);
          break;
          
        case 'state':
          handleState(data);
          break;
          
        case 'error':
          console.error('Erro do WebSocket:', data.message);
          break;
      }
    };
    
    // Adicionar listener de eventos
    window.addEventListener('websocket-message', handleWebSocketEvent);
    
    // Limpar ao desmontar
    return () => {
      window.removeEventListener('websocket-message', handleWebSocketEvent);
    };
  }, [activeSessions, selectedSession]);
  
  // Auto-rolagem para o final dos logs quando novos logs são adicionados
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sessionLogs]);
  
  // Manipular eventos recebidos
  const handleEvent = (data) => {
    if (data.topic === 'automation') {
      handleAutomationEvent(data);
    } else if (data.topic === 'system') {
      handleSystemEvent(data);
    }
  };
  
  // Manipular estado recebido
  const handleState = (data) => {
    if (data.topic === 'automation' && data.params && data.params.sessionId) {
      // Atualizar detalhes da sessão selecionada
      if (selectedSession && selectedSession.id === data.params.sessionId) {
        setSessionDetails(data.state);
        
        if (data.state.logs) {
          setSessionLogs(data.state.logs);
        }
      }
      
      // Atualizar lista de sessões ativas
      setActiveSessions(prevSessions => {
        const sessionIndex = prevSessions.findIndex(s => s.id === data.params.sessionId);
        
        if (sessionIndex >= 0) {
          const updatedSessions = [...prevSessions];
          updatedSessions[sessionIndex] = {
            ...updatedSessions[sessionIndex],
            ...data.state
          };
          return updatedSessions;
        } else {
          return [...prevSessions, data.state];
        }
      });
    } else if (data.topic === 'system') {
      setSystemStatus(data.state);
    }
  };
  
  // Manipular eventos de automação
  const handleAutomationEvent = (data) => {
    const { action, session } = data.data;
    
    switch (action) {
      case 'session_started':
        // Adicionar nova sessão à lista
        setActiveSessions(prevSessions => [...prevSessions, session]);
        break;
        
      case 'session_updated':
        // Atualizar sessão existente
        setActiveSessions(prevSessions => {
          const sessionIndex = prevSessions.findIndex(s => s.id === session.id);
          
          if (sessionIndex >= 0) {
            const updatedSessions = [...prevSessions];
            updatedSessions[sessionIndex] = {
              ...updatedSessions[sessionIndex],
              ...session
            };
            return updatedSessions;
          }
          
          return prevSessions;
        });
        
        // Atualizar detalhes da sessão selecionada
        if (selectedSession && selectedSession.id === session.id) {
          setSessionDetails(prevDetails => ({
            ...prevDetails,
            ...session
          }));
          
          // Adicionar log, se houver
          if (session.log) {
            setSessionLogs(prevLogs => [...prevLogs, session.log]);
          }
        }
        break;
        
      case 'session_ended':
        // Atualizar sessão existente
        setActiveSessions(prevSessions => {
          const sessionIndex = prevSessions.findIndex(s => s.id === session.id);
          
          if (sessionIndex >= 0) {
            const updatedSessions = [...prevSessions];
            updatedSessions[sessionIndex] = {
              ...updatedSessions[sessionIndex],
              ...session
            };
            return updatedSessions;
          }
          
          return prevSessions;
        });
        
        // Atualizar detalhes da sessão selecionada
        if (selectedSession && selectedSession.id === session.id) {
          setSessionDetails(prevDetails => ({
            ...prevDetails,
            ...session
          }));
          
          // Adicionar log final
          setSessionLogs(prevLogs => [
            ...prevLogs, 
            {
              timestamp: new Date().toISOString(),
              message: session.result.success 
                ? 'Sessão concluída com sucesso' 
                : `Sessão falhou: ${session.result.error || 'Erro desconhecido'}`,
              level: session.result.success ? 'info' : 'error'
            }
          ]);
        }
        break;
    }
  };
  
  // Manipular eventos do sistema
  const handleSystemEvent = (data) => {
    setSystemStatus(data.data);
  };
  
  // Selecionar sessão
  const handleSelectSession = async (session) => {
    setSelectedSession(session);
    
    try {
      // Buscar detalhes completos da sessão
      const response = await fetch(`/api/monitoring/automation/sessions/${session.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSessionDetails(data.session);
        setSessionLogs(data.session.logs || []);
      } else {
        console.error('Erro ao buscar detalhes da sessão:', await response.text());
      }
    } catch (err) {
      console.error('Erro ao buscar detalhes da sessão:', err);
    }
  };
  
  // Iniciar nova sessão de automação
  const handleStartNewSession = async () => {
    try {
      const response = await fetch('/api/monitoring/automation/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: `Sessão ${new Date().toLocaleTimeString()}`,
          description: 'Sessão iniciada manualmente'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Nova sessão iniciada:', data);
      } else {
        console.error('Erro ao iniciar nova sessão:', await response.text());
      }
    } catch (err) {
      console.error('Erro ao iniciar nova sessão:', err);
    }
  };
  
  // Parar sessão de automação
  const handleStopSession = async (sessionId) => {
    try {
      const response = await fetch(`/api/monitoring/automation/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          success: false,
          error: 'Interrompido pelo usuário'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Sessão interrompida:', data);
      } else {
        console.error('Erro ao interromper sessão:', await response.text());
      }
    } catch (err) {
      console.error('Erro ao interromper sessão:', err);
    }
  };
  
  // Renderizar ícone de status
  const renderStatusIcon = (status) => {
    switch (status) {
      case 'starting':
        return <CircularProgress size={16} />;
      case 'running':
        return <PlayArrow color="primary" />;
      case 'completed':
        return <CheckCircle color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      default:
        return <Info />;
    }
  };
  
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
  
  // Mudar de aba
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Renderizar conteúdo com base na aba ativa
  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // Sessões Ativas
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 2, height: '70vh', overflow: 'auto' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Sessões Ativas</Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<PlayArrow />}
                    onClick={handleStartNewSession}
                  >
                    Nova Sessão
                  </Button>
                </Box>
                
                <List>
                  {activeSessions.length === 0 ? (
                    <ListItem>
                      <ListItemText primary="Nenhuma sessão ativa" />
                    </ListItem>
                  ) : (
                    activeSessions.map((session) => (
                      <React.Fragment key={session.id}>
                        <ListItem 
                          button 
                          selected={selectedSession && selectedSession.id === session.id}
                          onClick={() => handleSelectSession(session)}
                        >
                          <ListItemText 
                            primary={
                              <Box display="flex" alignItems="center">
                                {renderStatusIcon(session.status)}
                                <Typography sx={{ ml: 1 }}>{session.name}</Typography>
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="caption" display="block">
                                  ID: {session.id}
                                </Typography>
                                <Typography variant="caption" display="block">
                                  Início: {formatDateTime(session.startTime)}
                                </Typography>
                                {session.status === 'running' && (
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={session.progress || 0} 
                                    sx={{ mt: 1 }}
                                  />
                                )}
                              </Box>
                            }
                          />
                          
                          {session.status === 'running' && (
                            <IconButton 
                              edge="end" 
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStopSession(session.id);
                              }}
                            >
                              <Stop />
                            </IconButton>
                          )}
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    ))
                  )}
                </List>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={8}>
              {selectedSession ? (
                <Paper elevation={2} sx={{ p: 2, height: '70vh', overflow: 'hidden' }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      {sessionDetails?.name || selectedSession.name}
                    </Typography>
                    <StatusBadge status={sessionDetails?.status || selectedSession.status} />
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <ProgressCard 
                        title="Progresso"
                        value={sessionDetails?.progress || 0}
                        status={sessionDetails?.status}
                        currentStep={sessionDetails?.currentStep}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Card>
                        <CardContent>
                          <Typography variant="subtitle2" color="textSecondary">
                            Detalhes
                          </Typography>
                          <Box mt={1}>
                            <Typography variant="body2">
                              <strong>ID:</strong> {selectedSession.id}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Início:</strong> {formatDateTime(sessionDetails?.startTime || selectedSession.startTime)}
                            </Typography>
                            {sessionDetails?.endTime && (
                              <Typography variant="body2">
                                <strong>Fim:</strong> {formatDateTime(sessionDetails.endTime)}
                              </Typography>
                            )}
                            {sessionDetails?.startTime && sessionDetails?.endTime && (
                              <Typography variant="body2">
                                <strong>Duração:</strong> {formatDuration(new Date(sessionDetails.startTime), new Date(sessionDetails.endTime))}
                              </Typography>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Paper variant="outlined" sx={{ p: 1, height: '40vh', overflow: 'auto' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Logs
                        </Typography>
                        
                        <List dense>
                          {sessionLogs.length === 0 ? (
                            <ListItem>
                              <ListItemText primary="Nenhum log disponível" />
                            </ListItem>
                          ) : (
                            sessionLogs.map((log, index) => (
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
                    </Grid>
                  </Grid>
                </Paper>
              ) : (
                <Paper elevation={2} sx={{ p: 2, height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body1" color="textSecondary">
                    Selecione uma sessão para ver os detalhes
                  </Typography>
                </Paper>
              )}
            </Grid>
          </Grid>
        );
        
      case 1: // Status do Sistema
        return (
          <Grid container spacing={3}>
            {user.role === 'super_admin' && systemStatus ? (
              <>
                <Grid item xs={12} md={6} lg={3}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center">
                        <Memory color="primary" sx={{ fontSize: 40, mr: 2 }} />
                        <Box>
                          <Typography variant="h6">{Math.round(systemStatus.memoryUsage * 100) / 100} MB</Typography>
                          <Typography variant="body2" color="textSecondary">Uso de Memória</Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6} lg={3}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center">
                        <Terminal color="primary" sx={{ fontSize: 40, mr: 2 }} />
                        <Box>
                          <Typography variant="h6">{formatDuration(new Date(Date.now() - systemStatus.uptime * 1000), new Date())}</Typography>
                          <Typography variant="body2" color="textSecondary">Tempo de Atividade</Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6} lg={3}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center">
                        <Visibility color="primary" sx={{ fontSize: 40, mr: 2 }} />
                        <Box>
                          <Typography variant="h6">{systemStatus.activeClients}</Typography>
                          <Typography variant="body2" color="textSecondary">Clientes Conectados</Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6} lg={3}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center">
                        <Code color="primary" sx={{ fontSize: 40, mr: 2 }} />
                        <Box>
                          <Typography variant="h6">{systemStatus.activeSessions}</Typography>
                          <Typography variant="body2" color="textSecondary">Sessões Ativas</Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12}>
                  <Card>
                    <CardHeader title="Atividade do Sistema" />
                    <CardContent sx={{ height: '50vh' }}>
                      <TimelineChart />
                    </CardContent>
                  </Card>
                </Grid>
              </>
            ) : (
              <Grid item xs={12}>
                <Paper elevation={2} sx={{ p: 2, height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body1" color="textSecondary">
                    {user.role !== 'super_admin' 
                      ? 'Acesso restrito a Super Admin' 
                      : 'Carregando informações do sistema...'}
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        );
        
      default:
        return null;
    }
  };
  
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }
  
  return (
    <Container maxWidth="xl">
      <Box my={4}>
        <Typography variant="h4" gutterBottom>
          Monitoramento em Tempo Real
        </Typography>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Sessões Ativas" icon={<PlayArrow />} iconPosition="start" />
            <Tab label="Status do Sistema" icon={<Timeline />} iconPosition="start" />
          </Tabs>
        </Box>
        
        {renderTabContent()}
      </Box>
    </Container>
  );
};

export default RealTimeMonitoring;
