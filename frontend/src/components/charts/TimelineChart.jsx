// Componente para exibir gráficos de linha temporal
import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const TimelineChart = ({ data, title = 'Atividade do Sistema', height = 300 }) => {
  const [chartData, setChartData] = useState(null);
  
  useEffect(() => {
    // Se dados forem fornecidos, use-os
    if (data) {
      setChartData(data);
      return;
    }
    
    // Caso contrário, gere dados de exemplo
    const generateSampleData = () => {
      const now = new Date();
      const labels = [];
      const cpuData = [];
      const memoryData = [];
      const requestsData = [];
      
      // Gerar dados para as últimas 24 horas
      for (let i = 24; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        labels.push(time);
        
        // Valores aleatórios para exemplo
        cpuData.push(Math.floor(Math.random() * 40) + 10); // 10-50%
        memoryData.push(Math.floor(Math.random() * 500) + 200); // 200-700MB
        requestsData.push(Math.floor(Math.random() * 50) + 5); // 5-55 requisições
      }
      
      return {
        labels,
        datasets: [
          {
            label: 'CPU (%)',
            data: cpuData,
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            yAxisID: 'y',
          },
          {
            label: 'Memória (MB)',
            data: memoryData,
            borderColor: 'rgb(53, 162, 235)',
            backgroundColor: 'rgba(53, 162, 235, 0.5)',
            yAxisID: 'y1',
          },
          {
            label: 'Requisições',
            data: requestsData,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            yAxisID: 'y2',
          },
        ],
      };
    };
    
    setChartData(generateSampleData());
  }, [data]);
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    stacked: false,
    plugins: {
      title: {
        display: true,
        text: title,
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'hour',
          displayFormats: {
            hour: 'HH:mm'
          }
        },
        title: {
          display: true,
          text: 'Hora',
        },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'CPU (%)',
        },
        min: 0,
        max: 100,
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Memória (MB)',
        },
        grid: {
          drawOnChartArea: false,
        },
        min: 0,
      },
      y2: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Requisições',
        },
        grid: {
          drawOnChartArea: false,
        },
        min: 0,
      },
    },
  };
  
  if (!chartData) {
    return <div>Carregando dados...</div>;
  }
  
  return (
    <div style={{ height }}>
      <Line options={options} data={chartData} />
    </div>
  );
};

export default TimelineChart;
