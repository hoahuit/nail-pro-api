BEGIN TRY

BEGIN TRAN;

-- DropForeignKey (ignore if not exists)
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'booking_items_bookingId_fkey')
  ALTER TABLE [dbo].[booking_items] DROP CONSTRAINT [booking_items_bookingId_fkey];

IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'bookings_serviceId_fkey')
  ALTER TABLE [dbo].[bookings] DROP CONSTRAINT [bookings_serviceId_fkey];

-- AlterTable loyalty_accounts (only if column not exists)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'loyalty_accounts' AND COLUMN_NAME = 'isActive')
  ALTER TABLE [dbo].[loyalty_accounts] ADD [isActive] BIT NOT NULL CONSTRAINT [loyalty_accounts_isActive_df] DEFAULT 1;

-- AlterTable point_history (only if column not exists)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'point_history' AND COLUMN_NAME = 'staffName')
  ALTER TABLE [dbo].[point_history] ADD [staffName] NVARCHAR(1000);

-- Ensure bookings.serviceId is nullable for SET NULL FK
IF EXISTS (
  SELECT 1
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'bookings' AND COLUMN_NAME = 'serviceId' AND IS_NULLABLE = 'NO'
)
  ALTER TABLE [dbo].[bookings] ALTER COLUMN [serviceId] NVARCHAR(1000) NULL;

-- CreateTable loyalty_program_configs (only if not exists)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'loyalty_program_configs')
BEGIN
  CREATE TABLE [dbo].[loyalty_program_configs] (
      [id] NVARCHAR(1000) NOT NULL,
      [code] NVARCHAR(1000) NOT NULL CONSTRAINT [loyalty_program_configs_code_df] DEFAULT 'DEFAULT',
      [pointsPerVisit] INT NOT NULL CONSTRAINT [loyalty_program_configs_pointsPerVisit_df] DEFAULT 1,
      [createdAt] DATETIME2 NOT NULL CONSTRAINT [loyalty_program_configs_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
      [updatedAt] DATETIME2 NOT NULL,
      CONSTRAINT [loyalty_program_configs_pkey] PRIMARY KEY CLUSTERED ([id]),
      CONSTRAINT [loyalty_program_configs_code_key] UNIQUE NONCLUSTERED ([code])
  );
END;

-- CreateTable loyalty_reward_rules (only if not exists)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'loyalty_reward_rules')
BEGIN
  CREATE TABLE [dbo].[loyalty_reward_rules] (
      [id] NVARCHAR(1000) NOT NULL,
      [programId] NVARCHAR(1000) NOT NULL,
      [thresholdPoints] INT NOT NULL,
      [rewardType] NVARCHAR(1000) NOT NULL,
      [rewardValue] DECIMAL(10,2) NOT NULL,
      [isActive] BIT NOT NULL CONSTRAINT [loyalty_reward_rules_isActive_df] DEFAULT 1,
      [createdAt] DATETIME2 NOT NULL CONSTRAINT [loyalty_reward_rules_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
      [updatedAt] DATETIME2 NOT NULL,
      CONSTRAINT [loyalty_reward_rules_pkey] PRIMARY KEY CLUSTERED ([id]),
      CONSTRAINT [loyalty_reward_rules_programId_thresholdPoints_key] UNIQUE NONCLUSTERED ([programId],[thresholdPoints])
  );
END;

-- CreateTable salon_day_offs (only if not exists)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'salon_day_offs')
BEGIN
  CREATE TABLE [dbo].[salon_day_offs] (
      [id] NVARCHAR(1000) NOT NULL,
      [date] NVARCHAR(1000) NOT NULL,
      [reason] NVARCHAR(1000),
      [createdAt] DATETIME2 NOT NULL CONSTRAINT [salon_day_offs_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
      [updatedAt] DATETIME2 NOT NULL,
      CONSTRAINT [salon_day_offs_pkey] PRIMARY KEY CLUSTERED ([id]),
      CONSTRAINT [salon_day_offs_date_key] UNIQUE NONCLUSTERED ([date])
  );
END;

-- CreateIndex (only if not exists)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'loyalty_reward_rules_programId_thresholdPoints_idx')
  CREATE NONCLUSTERED INDEX [loyalty_reward_rules_programId_thresholdPoints_idx] ON [dbo].[loyalty_reward_rules]([programId], [thresholdPoints]);

-- AddForeignKey (only if not exists)
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'loyalty_reward_rules_programId_fkey')
  ALTER TABLE [dbo].[loyalty_reward_rules] ADD CONSTRAINT [loyalty_reward_rules_programId_fkey] FOREIGN KEY ([programId]) REFERENCES [dbo].[loyalty_program_configs]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'booking_items_bookingId_fkey')
  ALTER TABLE [dbo].[booking_items] ADD CONSTRAINT [booking_items_bookingId_fkey] FOREIGN KEY ([bookingId]) REFERENCES [dbo].[bookings]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'bookings_serviceId_fkey')
  ALTER TABLE [dbo].[bookings] ADD CONSTRAINT [bookings_serviceId_fkey] FOREIGN KEY ([serviceId]) REFERENCES [dbo].[services]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
