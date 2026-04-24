BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[booking_items] DROP CONSTRAINT [booking_items_bookingId_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[bookings] DROP CONSTRAINT [bookings_serviceId_fkey];

-- AlterTable
ALTER TABLE [dbo].[loyalty_accounts] ADD [isActive] BIT NOT NULL CONSTRAINT [loyalty_accounts_isActive_df] DEFAULT 1;

-- AlterTable
ALTER TABLE [dbo].[point_history] ADD [staffName] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[loyalty_program_configs] (
    [id] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL CONSTRAINT [loyalty_program_configs_code_df] DEFAULT 'DEFAULT',
    [pointsPerVisit] INT NOT NULL CONSTRAINT [loyalty_program_configs_pointsPerVisit_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [loyalty_program_configs_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [loyalty_program_configs_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [loyalty_program_configs_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
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

-- CreateTable
CREATE TABLE [dbo].[salon_day_offs] (
    [id] NVARCHAR(1000) NOT NULL,
    [date] NVARCHAR(1000) NOT NULL,
    [reason] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [salon_day_offs_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [salon_day_offs_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [salon_day_offs_date_key] UNIQUE NONCLUSTERED ([date])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [loyalty_reward_rules_programId_thresholdPoints_idx] ON [dbo].[loyalty_reward_rules]([programId], [thresholdPoints]);

-- AddForeignKey
ALTER TABLE [dbo].[loyalty_reward_rules] ADD CONSTRAINT [loyalty_reward_rules_programId_fkey] FOREIGN KEY ([programId]) REFERENCES [dbo].[loyalty_program_configs]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[booking_items] ADD CONSTRAINT [booking_items_bookingId_fkey] FOREIGN KEY ([bookingId]) REFERENCES [dbo].[bookings]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
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
