-- AlterTable: make serviceId nullable and add designImage on Booking
ALTER TABLE [dbo].[bookings] ALTER COLUMN [serviceId] NVARCHAR(1000) NULL;
ALTER TABLE [dbo].[bookings] ADD [designImage] NVARCHAR(1000) NULL;

-- CreateTable: booking_items
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

-- AddForeignKey: booking_items -> bookings
ALTER TABLE [dbo].[booking_items] ADD CONSTRAINT [booking_items_bookingId_fkey]
    FOREIGN KEY ([bookingId]) REFERENCES [dbo].[bookings]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: booking_items -> services
ALTER TABLE [dbo].[booking_items] ADD CONSTRAINT [booking_items_serviceId_fkey]
    FOREIGN KEY ([serviceId]) REFERENCES [dbo].[services]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey: booking_items -> staff
ALTER TABLE [dbo].[booking_items] ADD CONSTRAINT [booking_items_staffId_fkey]
    FOREIGN KEY ([staffId]) REFERENCES [dbo].[staff]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
