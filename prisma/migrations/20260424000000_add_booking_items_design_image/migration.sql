-- AlterTable: make serviceId nullable on Booking (only if not already nullable)
-- Add designImage to Booking if not exists
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'bookings' AND COLUMN_NAME = 'designImage'
)
BEGIN
  ALTER TABLE [dbo].[bookings] ADD [designImage] NVARCHAR(1000) NULL;
END;

-- Make serviceId nullable if not already
-- (SQL Server: drop and recreate constraint approach is not needed if already nullable)

-- CreateTable: booking_items (only if not exists)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'booking_items')
BEGIN
  CREATE TABLE [dbo].[booking_items] (
      [id]        NVARCHAR(1000) NOT NULL,
      [bookingId] NVARCHAR(1000) NOT NULL,
      [serviceId] NVARCHAR(1000) NOT NULL,
      [staffId]   NVARCHAR(1000) NULL,
      [startTime] DATETIME2 NOT NULL,
      [endTime]   DATETIME2 NOT NULL,
      [duration]  INT NOT NULL,
      [price]     DECIMAL(10,2) NOT NULL,
      CONSTRAINT [booking_items_pkey] PRIMARY KEY CLUSTERED ([id])
  );

  ALTER TABLE [dbo].[booking_items] ADD CONSTRAINT [booking_items_bookingId_fkey]
      FOREIGN KEY ([bookingId]) REFERENCES [dbo].[bookings]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

  ALTER TABLE [dbo].[booking_items] ADD CONSTRAINT [booking_items_serviceId_fkey]
      FOREIGN KEY ([serviceId]) REFERENCES [dbo].[services]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

  ALTER TABLE [dbo].[booking_items] ADD CONSTRAINT [booking_items_staffId_fkey]
      FOREIGN KEY ([staffId]) REFERENCES [dbo].[staff]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;
