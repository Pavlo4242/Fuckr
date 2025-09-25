import { simpleXmpp } from 'simple-xmpp'; // Fictional package, use a real one like 'stanza' or 'node-xmpp-client'
import axios from 'axios';
import { EventEmitter } from 'events';
import { profilesService } from './profilesService';
import { getLocalStorage, setLocalStorage } from './storageService'; // Storage helpers

// A simple event emitter to notify the UI of new messages
export const chatEvents = new EventEmitter();

let isConnected = false;

// Helper to generate UUIDs
const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
}).toUpperCase();

const addMessage = async (message: any) => {
    const profileId = getLocalStorage('profileId');
    const fromMe = parseInt(message.sourceProfileId) === profileId;
    const conversationId = fromMe ? parseInt(message.targetProfileId) : parseInt(message.sourceProfileId);

    if (profilesService.isBlocked(conversationId)) return;

    let conversations = getLocalStorage('conversations', {});

    if (message.type === 'block') {
        delete conversations[conversationId];
        if (fromMe) {
            profilesService.block(conversationId);
        } else {
            profilesService.blockedBy(conversationId);
        }
    } else {
        if (!conversations[conversationId]) {
            const profile = await profilesService.get(conversationId);
            conversations[conversationId] = {
                id: conversationId,
                messages: [],
                thumbnail: profile.profileImageMediaHash
            };
        }
        
        const conversation = conversations[conversationId];
        conversation.lastTimeActive = message.timestamp;

        let formattedMessage: any = { fromMe };
        switch (message.type) {
            case 'text': formattedMessage.text = message.body; break;
            case 'map': formattedMessage.location = JSON.parse(message.body); break;
            case 'image': formattedMessage.image = JSON.parse(message.body).imageHash; break;
            default: formattedMessage.text = `${message.type} ${message.body}`;
        }
        conversation.messages.push(formattedMessage);
    }
    
    setLocalStorage('conversations', conversations);
    chatEvents.emit('new_message');
};

const acknowledgeMessages = (messageIds: string[]) => {
    axios.post('https://primus.grindr.com/2.0/confirmChatMessagesDelivered', { messageIds });
};

const sendMessage = (type: string, body: string | null, to: number) => {
    const profileId = getLocalStorage('profileId');
    const message = {
        targetProfileId: String(to),
        type,
        messageId: uuid(),
        timestamp: Date.now(),
        sourceDisplayName: '',
        sourceProfileId: String(profileId),
        body,
    };
    simpleXmpp.send(`${to}@chat.grindr.com`, JSON.stringify(message));
    addMessage(message);
};

export const chatService = {
    connect: (token: string) => {
        const profileId = getLocalStorage('profileId');
        simpleXmpp.connect({
            jid: `${profileId}@chat.grindr.com`,
            password: token,
            host: 'chat.grindr.com',
            preferred: 'PLAIN'
        });

        simpleXmpp.on('online', async () => {
            isConnected = true;
            const response = await axios.get('https://primus.grindr.com/2.0/undeliveredChatMessages');
            const messages = response.data.sort((a: any, b: any) => a.timestamp - b.timestamp);
            const messageIds = messages.map((msg: any) => {
                addMessage(msg);
                return msg.messageId;
            });
            if (messageIds.length > 0) {
                acknowledgeMessages(messageIds);
            }
        });

        simpleXmpp.conn.on('stanza', (stanza: any) => {
            if (stanza.is('message')) {
                const message = JSON.parse(stanza.getChildText('body'));
                addMessage(message);
                acknowledgeMessages([message.messageId]);
            }
        });

        simpleXmpp.on('error', (message: string) => {
            console.error(`Chat error: ${message}`);
            simpleXmpp.disconnect();
            chatEvents.emit('chat_error', message);
        });
    },

    sendText: (text: string, to: number) => sendMessage('text', text, to),
    
    sendImage: (imageHash: string, to: number) => {
        const messageBody = JSON.stringify({ imageHash });
        sendMessage('image', messageBody, to);
    },

    sendLocation: (to: number) => {
        const { lat, lon } = getLocalStorage('grindrParams');
        const messageBody = JSON.stringify({ lat, lon });
        sendMessage('map', messageBody, to);
    },

    block: (id: number) => sendMessage('block', null, id),

    getConversation: (id: number) => getLocalStorage('conversations', {})[id],
    
    latestConversations: () => {
        const conversations = getLocalStorage('conversations', {});
        return Object.values(conversations).sort((a: any, b: any) => b.lastTimeActive - a.lastTimeActive);
    },

    get sentImages() {
        return getLocalStorage('sentImages', []);
    },

    get isConnected() { return isConnected; }
};
