ALTER TABLE events ADD COLUMN outdoor BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE events ADD COLUMN boundary_geojson TEXT;
ALTER TABLE events ADD COLUMN building_plan_base64 TEXT;

CREATE TABLE strategic_points (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    x_ratio DOUBLE PRECISION,
    y_ratio DOUBLE PRECISION
);
