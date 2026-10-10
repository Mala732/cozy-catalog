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
                sh 'docker compose build'
            }
        }

        stage('Deploy Local Staging') {
            steps {
                echo 'Deploying updated containers locally...'
                sh 'docker compose up -d'
            }
        }
    }

    post {
        success {
            echo 'Pipeline executed successfully!'
        }
        failure {
            echo 'Pipeline failed. Check container logs.'
        }
    }
}