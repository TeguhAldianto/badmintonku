-- CreateTable
CREATE TABLE `admins` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN') NOT NULL DEFAULT 'ADMIN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admins_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `courts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `courts_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bookings` (
    `id` VARCHAR(191) NOT NULL,
    `courtId` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `startTime` INTEGER NOT NULL,
    `endTime` INTEGER NOT NULL,
    `userName` VARCHAR(191) NOT NULL,
    `userPhone` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING_PAYMENT', 'WAITING_VERIFICATION', 'CONFIRMED', 'CANCELLED', 'REJECTED', 'EXPIRED', 'COMPLETED') NOT NULL DEFAULT 'PENDING_PAYMENT',
    `totalPrice` DECIMAL(10, 2) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `bookings_courtId_date_idx`(`courtId`, `date`),
    INDEX `bookings_userPhone_idx`(`userPhone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `proofUrl` VARCHAR(191) NULL,
    `status` ENUM('UNPAID', 'VERIFYING', 'PAID', 'REJECTED') NOT NULL DEFAULT 'UNPAID',
    `rejectionReason` VARCHAR(191) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payments_bookingId_key`(`bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blocked_slots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `courtId` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `startTime` INTEGER NOT NULL,
    `endTime` INTEGER NOT NULL,
    `reason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `blocked_slots_courtId_date_idx`(`courtId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_status_history` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `oldStatus` ENUM('PENDING_PAYMENT', 'WAITING_VERIFICATION', 'CONFIRMED', 'CANCELLED', 'REJECTED', 'EXPIRED', 'COMPLETED') NULL,
    `newStatus` ENUM('PENDING_PAYMENT', 'WAITING_VERIFICATION', 'CONFIRMED', 'CANCELLED', 'REJECTED', 'EXPIRED', 'COMPLETED') NOT NULL,
    `changedBy` VARCHAR(191) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `booking_status_history_bookingId_idx`(`bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_courtId_fkey` FOREIGN KEY (`courtId`) REFERENCES `courts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blocked_slots` ADD CONSTRAINT `blocked_slots_courtId_fkey` FOREIGN KEY (`courtId`) REFERENCES `courts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_status_history` ADD CONSTRAINT `booking_status_history_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
