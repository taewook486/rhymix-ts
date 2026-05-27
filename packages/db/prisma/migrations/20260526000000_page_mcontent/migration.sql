-- AddColumn mcontent to module_instances (additive, existing rows get null)
ALTER TABLE "module_instances" ADD COLUMN "mcontent" TEXT;
