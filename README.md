# 🎒 CampusBridge (캠퍼스 실시간 분실물 매칭 서비스)

## 1. 서비스 소개
* **대상 사용자**: 대학 캠퍼스 축제, 행사 및 일상 속에서 분실물이나 습득물을 찾거나 등록하려는 대학생 및 교직원
* **핵심 기능**:
  * 카테고리별 실시간 채팅방 개설 및 필터링
  * Socket.io 기반 실시간 양방향 채팅 및 이미지 전송
  * 방장(호스트) 권한을 통한 '해결 완료' 처리 기능

## 2. AWS 구성도
* **요청 경로**: 
  클라이언트 브라우저 ➔ AWS EC2 인스턴스 (Ubuntu, 포트 3000) ➔ Docker Container (Node.js & Express / Socket.io)
* **서비스 선택 이유**:
  * **AWS EC2**: 프리티어를 활용해 독립된 리눅스 서버 환경을 구축하고, 퍼블릭 IP를 통해 언제 어디서나 외부 접속 가능한 환경 제공
  * **Docker / Docker Compose**: 개발 환경과 배포 서버 환경의 차이를 없애고, 명령어 한 줄로 노드 및 패키지 의존성을 일괄 빌드 및 실행

## 3. 실행 및 배포
* **준비 사항**: AWS EC2 인스턴스 (Ubuntu), Docker, Docker Compose, Git
* **사용 포트**: `3000`
* **접속 주소**: `http://16.179.27.184:3000`
* **실행 및 배포 명령어**:
  ```bash
  # 1. 저장소 클론 및 폴더 이동
  git clone [https://github.com/본인아이디/week_10.git](https://github.com/본인아이디/week_10.git)
  cd week_10

  # 2. 도커 컴포즈 빌드 및 백그라운드 실행
  docker compose up -d --build