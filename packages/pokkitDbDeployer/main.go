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

		deployPokkitDbFilesRecords, err := findAllDeployPokkitDbFilesRecords(e.App)
		if err != nil {
			log.Fatal("error returned from findAllDeployPokkitDbFilesRecords in app.OnServe().BindFunc: %w", err)
		}

		errors := writeFilesAndDeployPokkitDbs(e.App, deployPokkitDbFilesRecords)
		if errors != nil {
			e.App.Logger().Error("error returned from writeFilesAndDeployPokkitDbs in app.OnServe().BindFunc: %w", "errors", errors)
		}

		viteDeploymentRecords, err := findAllDeployViteFilesRecords(e.App)
		if err != nil {
			log.Fatal("error returned from findAllDeployViteFilesRecords in app.OnServe().BindFunc: %w", err)
		}

		viteErrors := writeFilesAndDeployVites(e.App, viteDeploymentRecords)
		if viteErrors != nil {
			e.App.Logger().Error("error returned from writeFilesAndDeployVites in app.OnServe().BindFunc: %w", "errors", viteErrors)
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

		truncatedHighestPortNumber, err := getTruncatedHighestDeploymentPortNumber(e.App)
		if err != nil {
			log.Fatal("error returned from assignMissingDeploymentPortNumbers in app.OnRecordCreate(deploymentsCollectionName).BindFunc: %w", err)
		}

		if deployPokkitDbFilesRecord.getPortNumber() == 0 {
			deployPokkitDbFilesRecord.setPortNumber(truncatedHighestPortNumber + 1)
		}
		if deployPokkitDbFilesRecord.getSslPortNumber() == 0 {
			deployPokkitDbFilesRecord.setSslPortNumber(truncatedHighestPortNumber + 2)
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

	app.OnRecordCreate(deployViteFilesCollectionName).BindFunc(func(e *pbCore.RecordEvent) error {
		deployViteFilesRecord := convertUnproxiedRecordToDeployViteFilesRecord(e.Record)

		truncatedHighestPortNumber, err := getTruncatedHighestDeploymentPortNumber(e.App)
		if err != nil {
			log.Fatal("error returned from getTruncatedHighestDeploymentPortNumber in app.OnRecordCreate(deployViteFilesCollectionName).BindFunc: %w", err)
		}

		if deployViteFilesRecord.getPortNumber() == 0 {
			deployViteFilesRecord.setPortNumber(truncatedHighestPortNumber + 1)
		}
		if deployViteFilesRecord.getSslPortNumber() == 0 {
			deployViteFilesRecord.setSslPortNumber(truncatedHighestPortNumber + 2)
		}

		return e.Next()
	})

	app.OnRecordAfterCreateSuccess(deployViteFilesCollectionName).BindFunc(func(e *pbCore.RecordEvent) error {
		deploymentRecord := convertUnproxiedRecordToDeployViteFilesRecord(e.Record)

		err := writeFilesAndDeployVite(e.App, deploymentRecord)
		if err != nil {
			log.Fatal("error returned from writeFilesAndDeployVite in app.OnRecordAfterCreateSuccess(deployViteFilesCollectionName).BindFunc: %w", err)
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

		viteRecords, err := e.App.FindAllRecords(deployViteFilesCollectionName)
		if err != nil {
			log.Fatal("error returned from e.App.FindAllRecords(deployViteFilesCollectionName) in app.OnTerminate(): %w", err)
		}
		for _, record := range viteRecords {
			deploymentRecord := convertUnproxiedRecordToDeployViteFilesRecord(record)
			pokkitDbUtils.KillProcessByPortNumber(deploymentRecord.getPortNumber())
		}

		return e.Next()
	})

}
