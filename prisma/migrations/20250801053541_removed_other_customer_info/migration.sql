/*
  Warnings:

  - You are about to drop the column `contactPerson` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `creditLimit` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `creditTerms` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `customerType` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `emailAddress` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `phoneNumber` on the `customers` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `customers_customerType_idx` ON `customers`;

-- AlterTable
ALTER TABLE `customers` DROP COLUMN `contactPerson`,
    DROP COLUMN `creditLimit`,
    DROP COLUMN `creditTerms`,
    DROP COLUMN `customerType`,
    DROP COLUMN `emailAddress`,
    DROP COLUMN `phoneNumber`;
