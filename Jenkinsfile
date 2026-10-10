pipeline {
    agent any

    stages {
        stage('Checkout Code') {
            steps {
                echo 'Checking out source code...'
            }
        }

        stage('Backend Unit Tests') {
            steps {
                echo 'Running Python unit tests...'
                sh 'docker exec cozy_backend python -m unittest discover -s app'
            }
        }

        stage('Build Container Images') {
            steps {
                echo 'Building fresh Docker images...'
                sh 'docker compose -p cozy-catalog build'
            }
        }

        stage('Deploy Local Staging') {
            steps {
                echo 'Deploying updated containers locally...'
                sh 'docker compose -p cozy-catalog up -d --force-recreate --remove-orphans'
            }
        }
    }

    post {
        success {
            echo 'Pipeline executed successfully! Staging application updated.'
        }
        failure {
            echo 'Pipeline build or deployment failed.'
        }
    }
}
