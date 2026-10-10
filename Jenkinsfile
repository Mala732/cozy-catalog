```groovy
pipeline {
    agent any

    stages {
        stage('Checkout Code') {
            steps {
                echo 'Using the project files available to Jenkins workspace'
            }
        }

        stage('Build & Start Staging Environment') {
            steps {
                echo 'Building and starting application containers...'
                sh 'docker compose -p cozy-catalog up -d --build --force-recreate --remove-orphans db backend frontend'
            }
        }

        stage('Backend Unit Tests') {
            steps {
                echo 'Running Python unit tests inside backend container...'
                sh 'docker exec cozy_backend python -m unittest discover -s app'
            }
        }
    }

    post {
        success {
            echo 'Pipeline executed successfully! Staging environment is live and tested.'
        }
        failure {
            echo 'Pipeline failed. Check build or test logs.'
        }
    }
}
```
