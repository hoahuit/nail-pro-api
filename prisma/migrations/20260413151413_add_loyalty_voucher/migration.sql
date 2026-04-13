BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[users] (
    [id] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [password] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [phone] NVARCHAR(1000),
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [users_role_df] DEFAULT 'CUSTOMER',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [users_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [users_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[loyalty_accounts] (
    [id] NVARCHAR(1000) NOT NULL,
    [phone] NVARCHAR(1000) NOT NULL,
    [customerName] NVARCHAR(1000),
    [totalPoints] INT NOT NULL CONSTRAINT [loyalty_accounts_totalPoints_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [loyalty_accounts_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [loyalty_accounts_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [loyalty_accounts_phone_key] UNIQUE NONCLUSTERED ([phone])
);

-- CreateTable
CREATE TABLE [dbo].[point_history] (
    [id] NVARCHAR(1000) NOT NULL,
    [loyaltyAccountId] NVARCHAR(1000) NOT NULL,
    [points] INT NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [amountSpent] DECIMAL(10,2),
    [note] NVARCHAR(1000),
    [addedByAdminId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [point_history_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [point_history_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[vouchers] (
    [id] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [value] DECIMAL(10,2) NOT NULL,
    [minOrderValue] DECIMAL(10,2),
    [maxUses] INT,
    [usedCount] INT NOT NULL CONSTRAINT [vouchers_usedCount_df] DEFAULT 0,
    [expiresAt] DATETIME2,
    [isActive] BIT NOT NULL CONSTRAINT [vouchers_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [vouchers_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [vouchers_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [vouchers_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[staff] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [phone] NVARCHAR(1000),
    [bio] NVARCHAR(1000),
    [avatar] NVARCHAR(1000),
    [isActive] BIT NOT NULL CONSTRAINT [staff_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [staff_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [staff_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [staff_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[services] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [image] NVARCHAR(1000),
    [duration] INT NOT NULL,
    [price] DECIMAL(10,2) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [services_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [services_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [services_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[bookings] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000),
    [customerName] NVARCHAR(1000) NOT NULL,
    [customerPhone] NVARCHAR(1000) NOT NULL,
    [customerEmail] NVARCHAR(1000),
    [serviceId] NVARCHAR(1000) NOT NULL,
    [staffId] NVARCHAR(1000),
    [startTime] DATETIME2 NOT NULL,
    [endTime] DATETIME2 NOT NULL,
    [duration] INT NOT NULL,
    [totalPrice] DECIMAL(10,2) NOT NULL,
    [discountAmount] DECIMAL(10,2),
    [finalPrice] DECIMAL(10,2),
    [voucherId] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [bookings_status_df] DEFAULT 'PENDING',
    [notes] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [bookings_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [bookings_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [bookings_staffId_startTime_endTime_idx] ON [dbo].[bookings]([staffId], [startTime], [endTime]);

-- AddForeignKey
ALTER TABLE [dbo].[point_history] ADD CONSTRAINT [point_history_loyaltyAccountId_fkey] FOREIGN KEY ([loyaltyAccountId]) REFERENCES [dbo].[loyalty_accounts]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[bookings] ADD CONSTRAINT [bookings_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[users]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[bookings] ADD CONSTRAINT [bookings_serviceId_fkey] FOREIGN KEY ([serviceId]) REFERENCES [dbo].[services]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[bookings] ADD CONSTRAINT [bookings_staffId_fkey] FOREIGN KEY ([staffId]) REFERENCES [dbo].[staff]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[bookings] ADD CONSTRAINT [bookings_voucherId_fkey] FOREIGN KEY ([voucherId]) REFERENCES [dbo].[vouchers]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
