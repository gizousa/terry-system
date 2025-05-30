// Contexto WebSocket para React
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Criar contexto
const WebSocketContext = createContext(null);

// Hook personalizado para usar o contexto
export const useWebSocket = () => useContext(WebSocketContext);

// Provedor do contexto
export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  
  // Conectar ao WebSocket
  const connect = useCallback(async (url) => {
    return new Promise((resolve, reject) => {
      try {
        // Fechar conexão existente, se houver
        if (socket && socket.readyState !== WebSocket.CLOSED) {
          socket.close();
        }
        
        // Criar nova conexão
        const newSocket = new WebSocket(`ws://${window.location.host}${url}`);
        
        // Configurar handlers
        newSocket.onopen = () => {
          setIsConnected(true);
          setError(null);
          console.log('WebSocket conectado');
          resolve();
        };
        
        newSocket.onclose = (event) => {
          setIsConnected(false);
          console.log(`WebSocket desconectado: ${event.code} ${event.reason}`);
          
          if (event.code !== 1000) { // Fechamento normal
            setError(`Conexão fechada: ${event.reason || 'Motivo desconhecido'}`);
          }
        };
        
        newSocket.onerror = (event) => {
          setError('Erro na conexão WebSocket');
          console.error('Erro WebSocket:', event);
          reject(new Error('Erro na conexão WebSocket'));
        };
        
        newSocket.onmessage = (event) => {
          // Disparar evento personalizado para que os componentes possam reagir
          const customEvent = new CustomEvent('websocket-message', { detail: event });
          window.dispatchEvent(customEvent);
        };
        
        // Armazenar socket
        setSocket(newSocket);
      } catch (err) {
        setError(`Falha ao conectar: ${err.message}`);
        console.error('Erro ao conectar ao WebSocket:', err);
        reject(err);
      }
    });
  }, [socket]);
  
  // Desconectar do WebSocket
  const disconnect = useCallback(() => {
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      socket.close(1000, 'Desconexão solicitada pelo cliente');
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);
  
  // Enviar mensagem
  const sendMessage = useCallback((message) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setError('Não conectado ao WebSocket');
      return false;
    }
    
    try {
      socket.send(typeof message === 'string' ? message : JSON.stringify(message));
      return true;
    } catch (err) {
      setError(`Erro ao enviar mensagem: ${err.message}`);
      console.error('Erro ao enviar mensagem:', err);
      return false;
    }
  }, [socket]);
  
  // Inscrever-se em tópico
  const subscribe = useCallback((topic, params = {}) => {
    return sendMessage({
      type: 'subscribe',
      topic,
      params
    });
  }, [sendMessage]);
  
  // Cancelar inscrição em tópico
  const unsubscribe = useCallback((topic, params = {}) => {
    return sendMessage({
      type: 'unsubscribe',
      topic,
      params
    });
  }, [sendMessage]);
  
  // Limpar ao desmontar
  useEffect(() => {
    return () => {
      if (socket && socket.readyState !== WebSocket.CLOSED) {
        socket.close(1000, 'Componente desmontado');
      }
    };
  }, [socket]);
  
  // Valor do contexto
  const value = {
    socket,
    isConnected,
    error,
    connect,
    disconnect,
    sendMessage,
    subscribe,
    unsubscribe
  };
  
  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext;
