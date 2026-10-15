-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "fieldroutesOfficeId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tech" (
    "id" TEXT NOT NULL,
    "fieldroutesEmployeeId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "nicknames" TEXT[],
    "branchId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "included" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tech_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Truck" (
    "id" TEXT NOT NULL,
    "bouncieImei" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Truck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TruckAssignment" (
    "id" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "techId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),

    CONSTRAINT "TruckAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceType" (
    "id" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isReservice" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ServiceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" INTEGER NOT NULL,
    "rawJson" JSONB NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" INTEGER NOT NULL,
    "assignedEmployeeId" INTEGER NOT NULL,
    "servicedByEmployeeId" INTEGER,
    "serviceTypeId" INTEGER,
    "category" TEXT,
    "isReservice" BOOLEAN NOT NULL DEFAULT false,
    "productionValue" DECIMAL(10,2),
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "customerId" INTEGER,
    "subscriptionId" INTEGER,
    "officeId" INTEGER,
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "imei" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "distanceMiles" DECIMAL(10,2) NOT NULL,
    "hardBrakes" INTEGER NOT NULL DEFAULT 0,
    "hardAccels" INTEGER NOT NULL DEFAULT 0,
    "speedingSeconds" INTEGER NOT NULL DEFAULT 0,
    "attributedTechId" TEXT,
    "rawJson" JSONB NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "location" TEXT,
    "reviewerName" TEXT,
    "stars" INTEGER NOT NULL,
    "text" TEXT,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "autoTechId" TEXT,
    "autoReason" TEXT,
    "manualTechId" TEXT,
    "manualNone" BOOLEAN NOT NULL DEFAULT false,
    "assignedBy" TEXT,
    "assignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiDefinition" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultGoal" DECIMAL(10,4) NOT NULL,
    "weight" DECIMAL(5,4) NOT NULL DEFAULT 0.2,
    "curveConfig" JSONB,

    CONSTRAINT "KpiDefinition_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "TechGoalOverride" (
    "id" TEXT NOT NULL,
    "techId" TEXT NOT NULL,
    "kpiKey" TEXT NOT NULL,
    "goal" DECIMAL(10,4) NOT NULL,
    "effectiveMonth" TEXT NOT NULL,

    CONSTRAINT "TechGoalOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyKpiResult" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "techId" TEXT NOT NULL,
    "kpiKey" TEXT NOT NULL,
    "actual" DECIMAL(10,4),
    "goal" DECIMAL(10,4) NOT NULL,
    "pacedGoal" DECIMAL(10,4),
    "progress" DECIMAL(10,4),
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inputs" JSONB,

    CONSTRAINT "MonthlyKpiResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyScore" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "techId" TEXT NOT NULL,
    "proscoreRaw" DECIMAL(10,4) NOT NULL,
    "proscore" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "frozen" BOOLEAN NOT NULL DEFAULT false,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrivenSnapshot" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "techId" TEXT,
    "techName" TEXT NOT NULL,
    "driving" DECIMAL(10,4),
    "drivingProg" DECIMAL(10,4),
    "reservice" DECIMAL(10,4),
    "resProg" DECIMAL(10,4),
    "prodHr" DECIMAL(10,4),
    "prodHrProg" DECIMAL(10,4),
    "complete" DECIMAL(10,4),
    "completeProg" DECIMAL(10,4),
    "stars" INTEGER,
    "starsProg" DECIMAL(10,4),
    "proscore" INTEGER,
    "rank" INTEGER,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileName" TEXT NOT NULL,

    CONSTRAINT "DrivenSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "counts" JSONB,
    "errors" JSONB,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_fieldroutesOfficeId_key" ON "Branch"("fieldroutesOfficeId");

-- CreateIndex
CREATE UNIQUE INDEX "Tech_fieldroutesEmployeeId_key" ON "Tech"("fieldroutesEmployeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Truck_bouncieImei_key" ON "Truck"("bouncieImei");

-- CreateIndex
CREATE INDEX "TruckAssignment_truckId_startDate_idx" ON "TruckAssignment"("truckId", "startDate");

-- CreateIndex
CREATE INDEX "Appointment_date_status_idx" ON "Appointment"("date", "status");

-- CreateIndex
CREATE INDEX "Appointment_assignedEmployeeId_date_idx" ON "Appointment"("assignedEmployeeId", "date");

-- CreateIndex
CREATE INDEX "Appointment_servicedByEmployeeId_date_idx" ON "Appointment"("servicedByEmployeeId", "date");

-- CreateIndex
CREATE INDEX "Trip_imei_startedAt_idx" ON "Trip"("imei", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_externalId_key" ON "Review"("externalId");

-- CreateIndex
CREATE INDEX "Review_postedAt_idx" ON "Review"("postedAt");

-- CreateIndex
CREATE INDEX "MonthlyKpiResult_month_techId_idx" ON "MonthlyKpiResult"("month", "techId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyKpiResult_month_techId_kpiKey_key" ON "MonthlyKpiResult"("month", "techId", "kpiKey");

-- CreateIndex
CREATE INDEX "MonthlyScore_month_idx" ON "MonthlyScore"("month");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyScore_month_techId_key" ON "MonthlyScore"("month", "techId");

-- CreateIndex
CREATE INDEX "DrivenSnapshot_month_idx" ON "DrivenSnapshot"("month");

-- AddForeignKey
ALTER TABLE "Tech" ADD CONSTRAINT "Tech_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TruckAssignment" ADD CONSTRAINT "TruckAssignment_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TruckAssignment" ADD CONSTRAINT "TruckAssignment_techId_fkey" FOREIGN KEY ("techId") REFERENCES "Tech"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_imei_fkey" FOREIGN KEY ("imei") REFERENCES "Truck"("bouncieImei") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_attributedTechId_fkey" FOREIGN KEY ("attributedTechId") REFERENCES "Tech"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_autoTechId_fkey" FOREIGN KEY ("autoTechId") REFERENCES "Tech"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_manualTechId_fkey" FOREIGN KEY ("manualTechId") REFERENCES "Tech"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechGoalOverride" ADD CONSTRAINT "TechGoalOverride_techId_fkey" FOREIGN KEY ("techId") REFERENCES "Tech"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechGoalOverride" ADD CONSTRAINT "TechGoalOverride_kpiKey_fkey" FOREIGN KEY ("kpiKey") REFERENCES "KpiDefinition"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyKpiResult" ADD CONSTRAINT "MonthlyKpiResult_techId_fkey" FOREIGN KEY ("techId") REFERENCES "Tech"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyKpiResult" ADD CONSTRAINT "MonthlyKpiResult_kpiKey_fkey" FOREIGN KEY ("kpiKey") REFERENCES "KpiDefinition"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyScore" ADD CONSTRAINT "MonthlyScore_techId_fkey" FOREIGN KEY ("techId") REFERENCES "Tech"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

