-- Performance Optimization Indexes for Towns Wars
-- Add these indexes to improve query performance

-- Towns table indexes
CREATE INDEX IF NOT EXISTS idx_towns_address ON towns(address);
CREATE INDEX IF NOT EXISTS idx_towns_channel_id ON towns(channel_id);
CREATE INDEX IF NOT EXISTS idx_towns_level ON towns(level);

-- Resources table indexes
CREATE INDEX IF NOT EXISTS idx_resources_town_address ON resources(town_address);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_town_type ON resources(town_address, type);

-- Actions table indexes
CREATE INDEX IF NOT EXISTS idx_actions_town_address ON actions(town_address);
CREATE INDEX IF NOT EXISTS idx_actions_tick ON actions(tick);
CREATE INDEX IF NOT EXISTS idx_actions_type ON actions(type);
CREATE INDEX IF NOT EXISTS idx_actions_town_tick ON actions(town_address, tick);

-- Battles table indexes
CREATE INDEX IF NOT EXISTS idx_battles_attacker ON battles(attacker_address);
CREATE INDEX IF NOT EXISTS idx_battles_defender ON battles(defender_address);
CREATE INDEX IF NOT EXISTS idx_battles_end ON battles(end);
CREATE INDEX IF NOT EXISTS idx_battles_cooldown_end ON battles(cooldown_end);
CREATE INDEX IF NOT EXISTS idx_battles_active ON battles(end) WHERE end > (SELECT current_tick FROM game_state LIMIT 1);

-- Shields table indexes
CREATE INDEX IF NOT EXISTS idx_shields_town_address ON shields(town_address);
CREATE INDEX IF NOT EXISTS idx_shields_end ON shields(end);
CREATE INDEX IF NOT EXISTS idx_shields_cooldown_end ON shields(cooldown_end);

-- Boosts table indexes
CREATE INDEX IF NOT EXISTS idx_boosts_town_address ON boosts(town_address);
CREATE INDEX IF NOT EXISTS idx_boosts_end ON boosts(end);
CREATE INDEX IF NOT EXISTS idx_boosts_cooldown_end ON boosts(cooldown_end);

-- Main messages table indexes
CREATE INDEX IF NOT EXISTS idx_main_messages_channel_id ON main_messages(channel_id);

-- Town errors table indexes
CREATE INDEX IF NOT EXISTS idx_town_errors_town_address ON town_errors(town_address);
CREATE INDEX IF NOT EXISTS idx_town_errors_tick ON town_errors(tick);
