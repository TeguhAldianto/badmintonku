-- AlterTable
ALTER TABLE `notification_logs` ADD COLUMN `idempotencyKey` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `notification_logs_idempotencyKey_key` ON `notification_logs`(`idempotencyKey`);
