-- Dodanie kolumny na przypisany punkt strategiczny w shifts
ALTER TABLE shifts ADD COLUMN strategic_point_id UUID REFERENCES strategic_points(id) ON DELETE SET NULL;

-- Tabela dla własnych ról
CREATE TABLE custom_roles (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    permissions TEXT NOT NULL DEFAULT '' -- comma separated e.g. "VIEW_MAP,WRITE_CHAT,SEND_SOS,REACT_STAFFING"
);

-- Dodanie kolumny custom_role_id w event_members
ALTER TABLE event_members ADD COLUMN custom_role_id UUID REFERENCES custom_roles(id) ON DELETE SET NULL;

-- Tabela dla zapotrzebowania na ludzi
CREATE TABLE staffing_requests (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
    strategic_point_id UUID REFERENCES strategic_points(id) ON DELETE CASCADE,
    count_needed INT NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela dla reakcji (zgłoszeń) na zapotrzebowanie
CREATE TABLE staffing_responses (
    id UUID PRIMARY KEY,
    staffing_request_id UUID NOT NULL REFERENCES staffing_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(staffing_request_id, user_id)
);
