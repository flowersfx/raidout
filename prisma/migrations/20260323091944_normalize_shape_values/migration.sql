-- Normalize legacy shape values to new names
UPDATE "Position" SET "shape" = 'rectangular' WHERE "shape" = 'rect';
UPDATE "Position" SET "shape" = 'round' WHERE "shape" = 'circle';