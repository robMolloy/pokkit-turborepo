package pokkitDbUtils

import (
	"bufio"
	"fmt"
	"log"
	"os/exec"
	"sync"
)

type handlers struct {
	doneWaiting func()
	killProcess func()
}

func ExecuteBashCommand(bashCommand string) error {
	cmd := exec.Command("bash", "-c", bashCommand)
	return cmd.Start()
}

func closeOnce(c chan<- struct{}) func() {
	var once sync.Once
	return func() {
		once.Do(func() {
			close(c)
		})
	}
}

func ExecuteAndWaitBashCommand(
	bashCommand string,
	handleOutputLine func(line string, handlers handlers),
) error {
	cmd := exec.Command("bash", "-c", bashCommand)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}

	if err := cmd.Start(); err != nil {
		return err
	}

	done := make(chan struct{})
	doneWaiting := closeOnce(done)
	killProcess := func() {
		_ = cmd.Process.Kill()
		doneWaiting()
	}
	handlers := handlers{
		doneWaiting: doneWaiting,
		killProcess: killProcess,
	}

	go func() {
		scanner := bufio.NewScanner(stdout)

		err := scanner.Err()
		if err != nil {
			log.Printf("error returned from bufio.NewScanner in ExecuteAndWaitBashCommand: %v", err)
		}
		for scanner.Scan() {
			handleOutputLine(scanner.Text(), handlers)
		}
		handlers.doneWaiting()
		_ = cmd.Wait()
	}()

	<-done
	return nil
}

func KillProcessByPortNumber(portNumber int) error {
	err := ExecuteBashCommand(
		fmt.Sprintf(`kill -15 $(lsof -tiTCP:"%d" -sTCP:LISTEN 2>/dev/null | head -n 1) 2>/dev/null || true`, portNumber),
	)

	if err != nil {
		return fmt.Errorf("error returned from ExecuteBashCommand in KillPocketbaseInstanceByDbPortNumber: %w", err)
	}
	return nil
}
