"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

import { Label } from '@/components/ui/label';
import { SmsLog } from '@/types/sms';

export default function SmsMessages() {
  const [sendForm, setSendForm] = useState({
    recipient: '',
    message: '',
    simPort: 1,
    sending: false
  });

  const [messages, setMessages] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [gatewayStatus, setGatewayStatus] = useState<'online' | 'offline'>('offline');
  const [availablePorts, setAvailablePorts] = useState<any[]>([]);

  useEffect(() => {
    loadMessages();
    checkGatewayStatus();
    
    // Auto-refresh messages every 30 seconds
    const interval = setInterval(loadMessages, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      // Simulate loading messages from localStorage/API
      const savedMessages = localStorage.getItem('sms_messages');
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      } else {
        // Load mock data for demonstration
        const mockMessages: SmsLog[] = [
          {
            id: 'sms_001',
            direction: 'outbound',
            recipient: '+355694123456',
            message: 'Përshëndetje! Ky është një mesazh test nga CRM Worksuite.',
            provider: 'dinstar',
            status: 'delivered',
            message_type: 'original',
            sent_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            delivered_at: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
            created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            updated_at: new Date(Date.now() - 1000 * 60 * 4).toISOString()
          },
          {
            id: 'sms_002',
            direction: 'inbound',
            sender: '+355694987654',
            message: 'Faleminderit për informacionin!',
            provider: 'dinstar',
            status: 'received',
            message_type: 'original',
            received_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
            created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
            updated_at: new Date(Date.now() - 1000 * 60 * 2).toISOString()
          }
        ];
        setMessages(mockMessages);
        localStorage.setItem('sms_messages', JSON.stringify(mockMessages));
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkGatewayStatus = () => {
    try {
      const config = localStorage.getItem('dinstar_config');
      if (config) {
        const parsedConfig = JSON.parse(config);
        // Simple check if config is complete
        const isConfigured = parsedConfig.baseUrl && parsedConfig.username && parsedConfig.password;
        setGatewayStatus(isConfigured ? 'online' : 'offline');
        
        // Load available SIM ports
        if (parsedConfig.simPorts && parsedConfig.simPorts.length > 0) {
          setAvailablePorts(parsedConfig.simPorts);
          // Set default SIM port if not already set
          if (!sendForm.simPort && parsedConfig.simPort) {
            setSendForm(prev => ({ ...prev, simPort: parsedConfig.simPort }));
          }
        }
      }
    } catch (error) {
      setGatewayStatus('offline');
    }
  };

  const sendSms = async () => {
    if (!sendForm.recipient || !sendForm.message) {
      alert('Ju lutem plotësoni numrin dhe mesazhin');
      return;
    }

    if (gatewayStatus === 'offline') {
      alert('Gateway nuk është i konfiguruar. Shkoni tek Konfigurimi për ta vendosur.');
      return;
    }

    setSendForm(prev => ({ ...prev, sending: true }));

    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: sendForm.recipient,
          message: sendForm.message,
          simPort: sendForm.simPort
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Add message to local list
        const newMessage: SmsLog = {
          id: `sms_${Date.now()}`,
          direction: 'outbound',
          recipient: sendForm.recipient,
          message: sendForm.message,
          provider: 'dinstar',
          status: 'sent',
          message_type: 'original',
          sent_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const updatedMessages = [newMessage, ...messages];
        setMessages(updatedMessages);
        localStorage.setItem('sms_messages', JSON.stringify(updatedMessages));

        // Clear form
        setSendForm({ recipient: '', message: '', simPort: sendForm.simPort, sending: false });
        
        alert('SMS u dërgua me sukses!');
      } else {
        alert(`Gabim në dërgimin e SMS: ${result.message}`);
      }
    } catch (error) {
      console.error('SMS send error:', error);
      alert('Gabim në dërgimin e SMS. Provoni sërish.');
    } finally {
      setSendForm(prev => ({ ...prev, sending: false }));
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Albanian phone number formatting
    return phone.replace(/(\+355)(\d{2})(\d{3})(\d{4})/, '$1 $2 $3 $4');
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      sent: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      received: 'bg-purple-100 text-purple-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    
    const labels = {
      sent: 'Dërguar',
      delivered: 'Dorëzuar',
      failed: 'Gabim',
      received: 'Marrë',
      pending: 'Duke procesuar'
    };
    
    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('sq-AL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const outboundMessages = messages.filter(m => m.direction === 'outbound');
  const inboundMessages = messages.filter(m => m.direction === 'inbound');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Duke ngarkuar mesazhet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SMS Messages</h1>
              <p className="text-gray-600 mt-2">Dërgoni dhe merrni SMS përmes gateway Dinstar</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${gatewayStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  Gateway: {gatewayStatus === 'online' ? 'Online' : 'Offline'}
                </span>
              </div>
              <Button 
                onClick={() => window.location.href = '/sms-config'}
                variant="outline"
                size="sm"
              >
                Konfigurimi
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Send SMS Form */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg sticky top-6">
              <CardHeader>
                <CardTitle className="text-xl text-gray-800">Dërgo SMS</CardTitle>
                <p className="text-sm text-gray-600">Dërgoni SMS tek numrat tuaj</p>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div>
                  <Label htmlFor="recipient" className="text-sm font-medium text-gray-700">
                    Numri Marrës <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="recipient"
                    type="tel"
                    placeholder="+355694123456"
                    value={sendForm.recipient}
                    onChange={(e) => setSendForm(prev => ({ ...prev, recipient: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                {/* SIM Port Selection */}
                {availablePorts.length > 0 && (
                  <div>
                    <Label htmlFor="simPort" className="text-sm font-medium text-gray-700">
                      Porta SIM
                    </Label>
                    <select
                      id="simPort"
                      value={sendForm.simPort}
                      onChange={(e) => setSendForm(prev => ({ ...prev, simPort: parseInt(e.target.value) }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {availablePorts.map((port) => (
                        <option key={port.port} value={port.port} disabled={port.status !== 'active'}>
                          Porta {port.port} - {port.simNumber} ({port.status === 'active' ? 'Aktive' : 'Jo Aktive'})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Zgjidhni portën SIM për dërgimin e SMS
                    </p>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="message" className="text-sm font-medium text-gray-700">
                    Mesazhi <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Shkruani mesazhin tuaj këtu..."
                    value={sendForm.message}
                    onChange={(e) => setSendForm(prev => ({ ...prev, message: e.target.value }))}
                    className="mt-1 h-32"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {sendForm.message.length}/160 karaktere
                  </p>
                </div>
                
                <Button 
                  onClick={sendSms}
                  disabled={sendForm.sending || !sendForm.recipient || !sendForm.message || gatewayStatus === 'offline'}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {sendForm.sending ? 'Duke dërguar...' : 'Dërgo SMS'}
                </Button>

                {gatewayStatus === 'offline' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">
                      Gateway nuk është i konfiguruar. 
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-red-700 underline ml-1"
                        onClick={() => window.location.href = '/sms-config'}
                      >
                        Konfiguroni këtu
                      </Button>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Messages List - Simplified */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-gray-800">Historiku i Mesazheve</CardTitle>
                  <Button 
                    onClick={loadMessages}
                    variant="outline"
                    size="sm"
                  >
                    Rifresko
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  {messages.length > 0 ? `${messages.length} mesazhe gjithsej (${outboundMessages.length} dërguar, ${inboundMessages.length} marrë)` : 'Nuk ka mesazhe'}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {messages.length > 0 ? (
                    messages.map((message) => (
                      <div key={message.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                              message.direction === 'inbound' ? 'bg-purple-500' : 'bg-blue-500'
                            }`}></div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">
                                {message.direction === 'inbound' ? 
                                  `Nga: ${formatPhoneNumber(message.sender || '')}` : 
                                  `Tek: ${formatPhoneNumber(message.recipient || '')}`
                                }
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDateTime(message.created_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-400">
                              {message.direction === 'inbound' ? 'Marrë' : 'Dërguar'}
                            </span>
                            {getStatusBadge(message.status)}
                          </div>
                        </div>
                        <div className={`p-3 rounded-lg ${
                          message.direction === 'inbound' ? 'bg-blue-50 border-l-4 border-blue-400' : 'bg-gray-100 border-l-4 border-gray-400'
                        }`}>
                          <p className="text-sm text-gray-700">
                            {message.message}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <div className="w-8 h-8 bg-gray-300 rounded"></div>
                      </div>
                      <h3 className="text-lg font-medium text-gray-800 mb-2">Nuk ka mesazhe</h3>
                      <p className="text-gray-500">Dërgoni SMS-in e parë tuaj për të filluar</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}