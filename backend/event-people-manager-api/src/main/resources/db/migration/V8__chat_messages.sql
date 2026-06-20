CREATE TABLE chat_messages (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    channel VARCHAR(50),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_messages_event ON chat_messages(event_id);
CREATE INDEX idx_chat_messages_event_channel ON chat_messages(event_id, channel);
CREATE INDEX idx_chat_messages_sender_recipient ON chat_messages(sender_id, recipient_id);
