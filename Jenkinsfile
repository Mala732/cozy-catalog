pipeline {
    agent any

    parameters {
        string(
            name: 'ADMIN_SOURCE_IP',
            defaultValue: '',
            description: 'Public IPv4 address allowed to SSH into the Azure VM, in CIDR format, e.g. 203.0.113.10/32'
        )
    }

    environment {
        COMPOSE_PROJECT_NAME = 'deploylab-ci'
        COMPOSE_FILE = 'docker-compose.yml'

        POSTGRES_USER = 'deploylab_ci'
        POSTGRES_PASSWORD = 'ci-test-password'
        POSTGRES_DB = 'deploylab_ci'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm

                script {
                    env.DEPLOY_VERSION = sh(
                        returnStdout: true,
                        script: 'git rev-parse --short HEAD'
                    ).trim()

                    echo "Deploy version: ${env.DEPLOY_VERSION}"
                }
            }
        }

        stage('Validate') {
            steps {
                sh '''
                    docker compose -f "$COMPOSE_FILE" config --quiet
                '''
            }
        }

        stage('Build') {
            steps {
                sh '''
                    docker compose -f "$COMPOSE_FILE" build
                '''
            }
        }

        stage('Start Test Environment') {
            steps {
                sh '''
                    docker compose -f "$COMPOSE_FILE" up -d
                '''
            }
        }

        stage('API Smoke Test') {
            steps {
                sh '''
                    sleep 10

                    docker compose -f "$COMPOSE_FILE" ps

                    docker compose -f "$COMPOSE_FILE" exec -T backend \
                        python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/api/health').read().decode())"

                    docker compose -f "$COMPOSE_FILE" exec -T backend \
                        python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/api/status').read().decode())"

                    docker compose -f "$COMPOSE_FILE" exec -T backend \
                        python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/api/info').read().decode())"
                '''
            }
        }

        stage('Publish Images') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'deploylab-dockerhub',
                        usernameVariable: 'DOCKERHUB_USER',
                        passwordVariable: 'DOCKERHUB_TOKEN'
                    )
                ]) {
                    sh '''
                        echo "$DOCKERHUB_TOKEN" | docker login \
                            -u "$DOCKERHUB_USER" \
                            --password-stdin

                        docker tag \
                            "${COMPOSE_PROJECT_NAME}-backend" \
                            "${DOCKERHUB_USER}/deploylab-backend:${DEPLOY_VERSION}"

                        docker tag \
                            "${COMPOSE_PROJECT_NAME}-frontend" \
                            "${DOCKERHUB_USER}/deploylab-frontend:${DEPLOY_VERSION}"

                        docker push \
                            "${DOCKERHUB_USER}/deploylab-backend:${DEPLOY_VERSION}"

                        docker push \
                            "${DOCKERHUB_USER}/deploylab-frontend:${DEPLOY_VERSION}"

                        docker logout
                    '''
                }
            }
        }

        stage('Terraform Init') {
            steps {
                sh '''
                    terraform -chdir=terraform init \
                        -backend-config="path=/var/jenkins_home/deploylab-state/terraform.tfstate"
                '''
            }
        }

        stage('Terraform Validate') {
            steps {
                sh '''
                    terraform -chdir=terraform validate
                '''
            }
        }
        stage('Terraform Plan') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'deploylab-azure-sp',
                        usernameVariable: 'ARM_CLIENT_ID',
                        passwordVariable: 'ARM_CLIENT_SECRET'
                    ),
                        string(
                        credentialsId: 'deploylab-azure-tenant-id',
                        variable: 'ARM_TENANT_ID'
                    ),
                    string(
                        credentialsId: 'deploylab-azure-subscription-id',
                        variable: 'ARM_SUBSCRIPTION_ID'
                    ),
                    string(
                        credentialsId: 'deploylab-ssh-public-key',
                        variable: 'TF_VAR_ssh_public_key'
                    )
                ]) {
                    sh '''
                        TF_VAR_admin_source_ip="$ADMIN_SOURCE_IP" \
                        terraform -chdir=terraform plan -out=deploylab.tfplan
                    '''
                }
            }
        }

        stage('Terraform Apply') {
    input {
        message 'Apply this Terraform plan to Azure and create the DeployLab environment?'
        ok 'Apply to Azure'
            }

            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'deploylab-azure-sp',
                        usernameVariable: 'ARM_CLIENT_ID',
                        passwordVariable: 'ARM_CLIENT_SECRET'
                    ),
                    string(
                        credentialsId: 'deploylab-azure-tenant-id',
                        variable: 'ARM_TENANT_ID'
                    ),
                    string(
                        credentialsId: 'deploylab-azure-subscription-id',
                        variable: 'ARM_SUBSCRIPTION_ID'
                    )
                ]) {
                    sh '''
                        test -f terraform/deploylab.tfplan || {
                            echo "Terraform plan file is missing."
                            exit 1
                        }

                        terraform -chdir=terraform apply \
                            -auto-approve \
                            deploylab.tfplan
                    '''
                }
            }
        }

        stage('Show Deployment Endpoint') {
            steps {
                sh '''
                    VM_IP=$(terraform -chdir=terraform output -raw public_ip_address)

                    test -n "$VM_IP" || {
                        echo "Terraform did not return a public IP."
                        exit 1
                    }

                    echo ""
                    echo "========================================="
                    echo "DeployLab Azure VM created"
                    echo "========================================="
                    echo "Public IP: $VM_IP"
                    echo "URL:       http://$VM_IP"
                    echo "========================================="
                    echo ""
                '''
            }
        }

        stage('Test Azure SSH') {
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'deploylab-ssh-private-key',
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    )
                ]) {
                    sh '''
                        VM_IP=$(terraform -chdir=terraform output -raw public_ip_address)

                        test -n "$VM_IP" || {
                            echo "Terraform did not return a public IP."
                            exit 1
                        }

                        echo "Testing SSH connectivity to $VM_IP..."

                        ssh \
                            -i "$SSH_KEY" \
                            -o StrictHostKeyChecking=no \
                            -o ConnectTimeout=15 \
                            "$SSH_USER@$VM_IP" \
                            'echo "SSH connection successful"; hostname; uname -a'
                    '''
                }
            }
        }

        stage('Publish Images') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'deploylab-dockerhub',
                        usernameVariable: 'DOCKERHUB_USER',
                        passwordVariable: 'DOCKERHUB_TOKEN'
                    )
                ]) {
                    sh '''
                        echo "$DOCKERHUB_TOKEN" | docker login \
                            -u "$DOCKERHUB_USER" \
                            --password-stdin

                        docker tag \
                            "${COMPOSE_PROJECT_NAME}-backend" \
                            "${DOCKERHUB_USERNAME}/deploylab-backend:${DEPLOY_VERSION}"

                        docker tag \
                            "${COMPOSE_PROJECT_NAME}-frontend" \
                            "${DOCKERHUB_USERNAME}/deploylab-frontend:${DEPLOY_VERSION}"

                        docker push \
                            "${DOCKERHUB_USERNAME}/deploylab-backend:${DEPLOY_VERSION}"

                        docker push \
                            "${DOCKERHUB_USERNAME}/deploylab-frontend:${DEPLOY_VERSION}"

                        docker logout
                    '''
                }
            }
        }
    }

    post {
        always {
            sh '''
                docker compose -f "$COMPOSE_FILE" down -v --remove-orphans || true
            '''
        }

        success {
            echo 'DeployLab CI pipeline completed successfully.'
        }

        failure {
            echo 'DeployLab CI pipeline failed. Check the stage logs.'
        }
    }
}
