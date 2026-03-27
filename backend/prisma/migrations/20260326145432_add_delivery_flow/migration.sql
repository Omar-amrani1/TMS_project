-- AlterTable
ALTER TABLE `orders` ADD COLUMN `destinationUserId` VARCHAR(191) NULL,
    ADD COLUMN `ratedAt` DATETIME(3) NULL,
    ADD COLUMN `ratedByUserId` VARCHAR(191) NULL,
    ADD COLUMN `ratingDamageFree` BOOLEAN NULL,
    ADD COLUMN `ratingOnTime` BOOLEAN NULL,
    MODIFY `type` ENUM('RAW_MATERIAL_ORDER', 'FINISHED_PRODUCT_ORDER', 'DELIVERY') NOT NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('MANAGER', 'RAW_STOCK_MANAGER', 'PRODUCTION_CLIENT', 'DISTRIBUTOR', 'TRANSPORT_PROVIDER', 'FINISHED_STOCK_MANAGER') NOT NULL;

-- CreateIndex
CREATE INDEX `orders_destinationUserId_idx` ON `orders`(`destinationUserId`);

-- CreateIndex
CREATE INDEX `orders_ratedByUserId_idx` ON `orders`(`ratedByUserId`);

-- CreateIndex
CREATE INDEX `orders_ratedAt_idx` ON `orders`(`ratedAt`);

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_destinationUserId_fkey` FOREIGN KEY (`destinationUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_ratedByUserId_fkey` FOREIGN KEY (`ratedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
