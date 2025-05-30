// Componente React para configuração e teste de WhatsApp
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Tabs, 
  Tab, 
  TextField, 
  Button, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Divider,
  Grid,
  Switch,
  FormControlLabel
} from '@mui/material';
import { WhatsApp, Api, Check, Error, Send } from '@mui/icons-material';

const WhatsAppConfig = ({ organizationId }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState([]);
  const [alert, setAlert] = useState(null);
  
  // Evolution API
  const [evolutionConfig, setEvolutionConfig] = useState({
    apiUrl: '',
    apiKey: '',
    instanceName: 'terry'
  });
  
  // Official API
  const [officialConfig, setOfficialConfig] = useState({
    accessToken: '',
    phoneNumberId: '',
    businessAccountId: '',
    webhookSecret: ''
  });
  
  // Test Message
  const [testMessage, setTestMessage] = useState({
    to: '',
    message: '',
    provider: 'auto'
  });
  
  // Fetch providers on component mount
  useEffect(() => {
    fetchProviders();
  }, [organizationId]);
  
  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/whatsapp/providers${organizationId ? `?organizationId=${organizationId}` : ''}`);
      const data = await response.json();
      
      if (data.success) {
        setProviders(data.providers || []);
      } else {
        setAlert({ type: 'error', message: data.message || 'Falha ao carregar provedores' });
      }
    } catch (error) {
      console.error('Erro ao carregar provedores:', error);
      setAlert({ type: 'error', message: error.message || 'Erro ao carregar provedores' });
    } finally {
      setLoading(false);
    }
  };
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Evolution API handlers
  const handleEvolutionChange = (e) => {
    const { name, value } = e.target;
    setEvolutionConfig(prev => ({ ...prev, [name]: value }));
  };
  
  const testEvolutionConnection = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/whatsapp/evolution/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(evolutionConfig)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAlert({ type: 'success', message: 'Conexão com EvolutionAPI estabelecida com sucesso!' });
      } else {
        setAlert({ type: 'error', message: data.message || 'Falha ao testar conexão com EvolutionAPI' });
      }
    } catch (error) {
      console.error('Erro ao testar conexão com EvolutionAPI:', error);
      setAlert({ type: 'error', message: error.message || 'Erro ao testar conexão com EvolutionAPI' });
    } finally {
      setLoading(false);
    }
  };
  
  const saveEvolutionConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/whatsapp/evolution/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...evolutionConfig,
          organizationId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAlert({ type: 'success', message: 'Configuração EvolutionAPI salva com sucesso!' });
        fetchProviders();
      } else {
        setAlert({ type: 'error', message: data.message || 'Falha ao salvar configuração EvolutionAPI' });
      }
    } catch (error) {
      console.error('Erro ao salvar configuração EvolutionAPI:', error);
      setAlert({ type: 'error', message: error.message || 'Erro ao salvar configuração EvolutionAPI' });
    } finally {
      setLoading(false);
    }
  };
  
  // Official API handlers
  const handleOfficialChange = (e) => {
    const { name, value } = e.target;
    setOfficialConfig(prev => ({ ...prev, [name]: value }));
  };
  
  const testOfficialConnection = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/whatsapp/official/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(officialConfig)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAlert({ type: 'success', message: 'Conexão com API Oficial estabelecida com sucesso!' });
      } else {
        setAlert({ type: 'error', message: data.message || 'Falha ao testar conexão com API Oficial' });
      }
    } catch (error) {
      console.error('Erro ao testar conexão com API Oficial:', error);
      setAlert({ type: 'error', message: error.message || 'Erro ao testar conexão com API Oficial' });
    } finally {
      setLoading(false);
    }
  };
  
  const saveOfficialConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/whatsapp/official/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...officialConfig,
          organizationId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAlert({ type: 'success', message: 'Configuração API Oficial salva com sucesso!' });
        fetchProviders();
      } else {
        setAlert({ type: 'error', message: data.message || 'Falha ao salvar configuração API Oficial' });
      }
    } catch (error) {
      console.error('Erro ao salvar configuração API Oficial:', error);
      setAlert({ type: 'error', message: error.message || 'Erro ao salvar configuração API Oficial' });
    } finally {
      setLoading(false);
    }
  };
  
  // Test message handlers
  const handleTestMessageChange = (e) => {
    const { name, value } = e.target;
    setTestMessage(prev => ({ ...prev, [name]: value }));
  };
  
  const sendTestMessage = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...testMessage,
          organizationId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAlert({ type: 'success', message: 'Mensagem de teste enviada com sucesso!' });
      } else {
        setAlert({ type: 'error', message: data.message || 'Falha ao enviar mensagem de teste' });
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem de teste:', error);
      setAlert({ type: 'error', message: error.message || 'Erro ao enviar mensagem de teste' });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            <WhatsApp sx={{ mr: 1 }} />
            Configuração WhatsApp
          </Typography>
          
          {alert && (
            <Alert 
              severity={alert.type} 
              sx={{ mb: 2 }}
              onClose={() => setAlert(null)}
            >
              {alert.message}
            </Alert>
          )}
          
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label="Provedores Configurados" />
              <Tab label="EvolutionAPI" />
              <Tab label="API Oficial" />
              <Tab label="Testar Mensagem" />
            </Tabs>
          </Box>
          
          {/* Provedores Configurados */}
          {activeTab === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Provedores Configurados
              </Typography>
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                  <CircularProgress />
                </Box>
              ) : providers.length === 0 ? (
                <Alert severity="info">
                  Nenhum provedor WhatsApp configurado. Configure pelo menos um provedor nas abas EvolutionAPI ou API Oficial.
                </Alert>
              ) : (
                <Grid container spacing={2}>
                  {providers.map((provider, index) => (
                    <Grid item xs={12} md={6} key={index}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" color="primary">
                            {provider.type === 'evolution' ? 'EvolutionAPI' : 'API Oficial'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Escopo: {provider.scope === 'global' ? 'Global' : 'Organização'}
                          </Typography>
                          {provider.type === 'evolution' ? (
                            <>
                              <Typography variant="body2">
                                URL da API: {provider.apiUrl}
                              </Typography>
                              <Typography variant="body2">
                                Instância: {provider.instanceName}
                              </Typography>
                            </>
                          ) : (
                            <>
                              <Typography variant="body2">
                                ID do Número: {provider.phoneNumberId}
                              </Typography>
                              {provider.businessAccountId && (
                                <Typography variant="body2">
                                  ID da Conta: {provider.businessAccountId}
                                </Typography>
                              )}
                            </>
                          )}
                          <Typography variant="body2" color="text.secondary">
                            Criado em: {new Date(provider.createdAt).toLocaleString()}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
              
              <Box sx={{ mt: 2 }}>
                <Button 
                  variant="outlined" 
                  onClick={fetchProviders}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                  disabled={loading}
                >
                  Atualizar Lista
                </Button>
              </Box>
            </Box>
          )}
          
          {/* EvolutionAPI */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Configuração EvolutionAPI
              </Typography>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                Configure a integração com EvolutionAPI para envio de mensagens WhatsApp.
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="URL da API"
                    name="apiUrl"
                    value={evolutionConfig.apiUrl}
                    onChange={handleEvolutionChange}
                    placeholder="https://evolution-api.example.com"
                    helperText="URL completa da sua instância EvolutionAPI"
                    required
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Chave API"
                    name="apiKey"
                    value={evolutionConfig.apiKey}
                    onChange={handleEvolutionChange}
                    type="password"
                    helperText="Chave de autenticação da EvolutionAPI"
                    required
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nome da Instância"
                    name="instanceName"
                    value={evolutionConfig.instanceName}
                    onChange={handleEvolutionChange}
                    placeholder="terry"
                    helperText="Nome da instância na EvolutionAPI"
                  />
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={testEvolutionConnection}
                  startIcon={loading ? <CircularProgress size={20} /> : <Api />}
                  disabled={loading || !evolutionConfig.apiUrl || !evolutionConfig.apiKey}
                >
                  Testar Conexão
                </Button>
                
                <Button
                  variant="contained"
                  onClick={saveEvolutionConfig}
                  startIcon={loading ? <CircularProgress size={20} /> : <Check />}
                  disabled={loading || !evolutionConfig.apiUrl || !evolutionConfig.apiKey}
                  color="primary"
                >
                  Salvar Configuração
                </Button>
              </Box>
            </Box>
          )}
          
          {/* API Oficial */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Configuração API Oficial do WhatsApp
              </Typography>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                Configure a integração com a API Oficial do WhatsApp Business para envio de mensagens.
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Token de Acesso"
                    name="accessToken"
                    value={officialConfig.accessToken}
                    onChange={handleOfficialChange}
                    type="password"
                    helperText="Token de acesso da API do WhatsApp Business"
                    required
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="ID do Número de Telefone"
                    name="phoneNumberId"
                    value={officialConfig.phoneNumberId}
                    onChange={handleOfficialChange}
                    helperText="ID do número de telefone no WhatsApp Business"
                    required
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="ID da Conta de Negócios"
                    name="businessAccountId"
                    value={officialConfig.businessAccountId}
                    onChange={handleOfficialChange}
                    helperText="ID da conta de negócios no WhatsApp Business (opcional)"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Segredo do Webhook"
                    name="webhookSecret"
                    value={officialConfig.webhookSecret}
                    onChange={handleOfficialChange}
                    type="password"
                    helperText="Segredo para verificação do webhook (opcional)"
                  />
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={testOfficialConnection}
                  startIcon={loading ? <CircularProgress size={20} /> : <Api />}
                  disabled={loading || !officialConfig.accessToken || !officialConfig.phoneNumberId}
                >
                  Testar Conexão
                </Button>
                
                <Button
                  variant="contained"
                  onClick={saveOfficialConfig}
                  startIcon={loading ? <CircularProgress size={20} /> : <Check />}
                  disabled={loading || !officialConfig.accessToken || !officialConfig.phoneNumberId}
                  color="primary"
                >
                  Salvar Configuração
                </Button>
              </Box>
            </Box>
          )}
          
          {/* Testar Mensagem */}
          {activeTab === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Enviar Mensagem de Teste
              </Typography>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                Envie uma mensagem de teste para verificar a configuração do WhatsApp.
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Número de Telefone"
                    name="to"
                    value={testMessage.to}
                    onChange={handleTestMessageChange}
                    placeholder="+5511999999999"
                    helperText="Número de telefone com código do país (ex: +5511999999999)"
                    required
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Mensagem"
                    name="message"
                    value={testMessage.message}
                    onChange={handleTestMessageChange}
                    multiline
                    rows={4}
                    helperText="Mensagem de texto a ser enviada"
                    required
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Provedor</InputLabel>
                    <Select
                      name="provider"
                      value={testMessage.provider}
                      onChange={handleTestMessageChange}
                      label="Provedor"
                    >
                      <MenuItem value="auto">Automático (Recomendado)</MenuItem>
                      <MenuItem value="evolution">EvolutionAPI</MenuItem>
                      <MenuItem value="official">API Oficial</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={sendTestMessage}
                  startIcon={loading ? <CircularProgress size={20} /> : <Send />}
                  disabled={loading || !testMessage.to || !testMessage.message}
                  color="primary"
                >
                  Enviar Mensagem de Teste
                </Button>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default WhatsAppConfig;
