package pokkitDbDeployer

import (
	"log"

	pbCore "github.com/pocketbase/pocketbase/core"
	"github.com/robMolloy/pokkit-turborepo/packages/pokkitDbUtils"
)

func BindFunctions(app pbCore.App) {
	app.OnServe().BindFunc(func(e *pbCore.ServeEvent) error {
		err := mergePokkitDbDeployerCollectionsFromSchema(e.App)
		if err != nil {
			log.Fatal("failed to mergePokkitDbDeployerCollectionsFromSchema(e.App) in app.OnServe().BindFunc: %w", err)
		}
		if err := e.Next(); err != nil {
			return err
		}

		unproxiedRecords, err := app.FindAllRecords(deployPokkitDbFilesCollectionName)
		if err != nil {
			log.Fatal("error returned from app.FindAllRecords(deploymentsCollectionName) in app.OnServe().BindFunc: %w", err)
		}
		deploymentRecords := convertUnproxiedRecordsToDeployPokkitDbFilesRecords(unproxiedRecords)

		errors := writeFilesAndDeployPokkitDbs(e.App, deploymentRecords)
		if errors != nil {
			e.App.Logger().Error("error returned from writeFilesAndDeployPokkitDbs in app.OnServe().BindFunc: %w", "errors", errors)
		}
		return nil
	})

	app.OnRecordAfterCreateSuccess(deployPokkitDbFilesCollectionName).BindFunc(func(e *pbCore.RecordEvent) error {
		deploymentRecord := convertUnproxiedRecordToDeployPokkitDbFilesRecord(e.Record)

		err := writeFilesAndDeployPokkitDb(e.App, deploymentRecord)
		if err != nil {
			log.Fatal("error returned from onRecordEventWriteAndDeployPokkitDb in app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc: %w", err)
		}
		return e.Next()
	})

	app.OnRecordCreate(deployPokkitDbFilesCollectionName).BindFunc(func(e *pbCore.RecordEvent) error {
		deployPokkitDbFilesRecord := convertUnproxiedRecordToDeployPokkitDbFilesRecord(e.Record)

		err := assignMissingDeploymentPortNumbers(e.App, deployPokkitDbFilesRecord)
		if err != nil {
			log.Fatal("error returned from assignMissingDeploymentPortNumbers in app.OnRecordCreate(deploymentsCollectionName).BindFunc: %w", err)
		}

		return e.Next()
	})

	app.OnRecordAfterCreateSuccess(deployPokkitDbFilesCollectionName).BindFunc(func(e *pbCore.RecordEvent) error {
		err := WriteDeploymentTemplatesToFile(e.App)
		if err != nil {
			log.Fatal("error returned from WriteNginxConfigToFile in app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc: %w", err)
		}
		err = ReloadNginxConfig(e.App)
		if err != nil {
			log.Fatal("error returned from ReloadNginxConfig in app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc: %w", err)
		}
		return e.Next()
	})

	app.OnTerminate().BindFunc(func(e *pbCore.TerminateEvent) error {
		records, err := e.App.FindAllRecords(deployPokkitDbFilesCollectionName)
		if err != nil {
			log.Fatal("error returned from e.App.FindAllRecords in app.OnTerminate(): %w", err)
		}
		e.App.Logger().Info("records", "records", records)
		for _, record := range records {
			deploymentRecord := convertUnproxiedRecordToDeployPokkitDbFilesRecord(record)
			pokkitDbUtils.KillProcessByPortNumber(deploymentRecord.getPortNumber())
		}

		return e.Next()
	})

}
