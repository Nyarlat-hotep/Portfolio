import { useState, useMemo, useCallback } from 'react';
import SideNav from './components/SideNav.jsx';
import PipelinePanel from './components/PipelinePanel.jsx';
import ComsHeader from './components/ComsHeader.jsx';
import MessageThread from './components/MessageThread.jsx';
import ClientDetails from './components/ClientDetails.jsx';
import ActiveCall from './components/ActiveCall.jsx';
import { MOCK_CLIENTS } from './data/clients.js';
import { getThreadsForClient } from './data/messages.js';
import './BananaPhonePrototype.css';

// Default selection mirrors source repo (Brian Thompson, id 10)
const DEFAULT_CLIENT = MOCK_CLIENTS.find(c => c.id === 10) || MOCK_CLIENTS[0];

export default function BananaPhonePrototype() {
  const [selectedId, setSelectedId] = useState(DEFAULT_CLIENT.id);
  const [activeChannel, setActiveChannel] = useState('text'); // 'text' | 'chat'
  const [callActive, setCallActive] = useState(false);
  const [pipelineTab, setPipelineTab] = useState('clients');
  const [sentMessages, setSentMessages] = useState({}); // { [clientId]: Message[] }

  const selectedClient = useMemo(
    () => MOCK_CLIENTS.find(c => c.id === selectedId) || DEFAULT_CLIENT,
    [selectedId]
  );

  const handleSelect = useCallback((client) => {
    setSelectedId(client.id);
    setActiveChannel('text');
    setCallActive(false);
  }, []);

  const handleSendMessage = useCallback((text) => {
    if (!text.trim()) return;
    const newMessage = {
      sender: 'banker',
      senderName: 'Clair Thomas',
      initials: 'CT',
      time: 'Just now',
      text: text.trim(),
    };
    setSentMessages(prev => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] || []), newMessage],
    }));
  }, [selectedId]);

  const threads = useMemo(() => {
    const base = getThreadsForClient(selectedId);
    const local = sentMessages[selectedId] || [];
    if (local.length === 0) return base;
    const todayIdx = base.findIndex(t => t.dateLabel === 'Today');
    if (todayIdx >= 0) {
      return base.map((t, i) =>
        i === todayIdx ? { ...t, messages: [...t.messages, ...local] } : t
      );
    }
    return [...base, { dateLabel: 'Today', messages: local }];
  }, [selectedId, sentMessages]);

  return (
    <div className="bp-app">
      <SideNav />

      <div className="bp-shell__content">
        <PipelinePanel
          clients={MOCK_CLIENTS}
          selectedId={selectedId}
          onSelect={handleSelect}
          activeTab={pipelineTab}
          onTabChange={setPipelineTab}
          callActiveClientId={callActive ? selectedId : null}
        />

        <div className="bp-shell__main">
          <div className="bp-shell__body">
            <div className="bp-shell__comms">
              <ComsHeader
                client={selectedClient}
                activeChannel={activeChannel}
                onChannelChange={setActiveChannel}
                onStartCall={() => setCallActive(true)}
                callActive={callActive}
              />
              {callActive ? (
                <ActiveCall
                  client={selectedClient}
                  onEnd={() => setCallActive(false)}
                />
              ) : (
                <MessageThread
                  client={selectedClient}
                  threads={threads}
                  channel={activeChannel}
                  onSend={handleSendMessage}
                />
              )}
            </div>

            <ClientDetails client={selectedClient} />
          </div>
        </div>
      </div>
    </div>
  );
}
