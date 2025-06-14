# constants
PORT=8081
HOST=localhost

# vendor
REDBEAN=vendor/redbean.com
ASSIMILATE=vendor/assimilate

# build
BUILD_DIR=build
BUILD=${BUILD_DIR}/braindump.com
DATA_DIR=${BUILD_DIR}/data
PID_FILE=${BUILD_DIR}/redbean.pid
LOG_FILE=${BUILD_DIR}/redbean.log

.PHONY: download run clean stop logs watch docker-build docker-run docker-stop build

# download dependencies
download:
	pnpm install
	curl -o ${REDBEAN} https://redbean.dev/redbean-3.0.0.com && chmod +x ${REDBEAN}
	curl -o ${ASSIMILATE} https://cosmo.zip/pub/cosmos/bin/assimilate && chmod +x ${ASSIMILATE}

build:
	pnpm run build
	cp -f ${REDBEAN} ${BUILD}
	cd src/ && zip -r ../${BUILD} `ls -A`

run: build
	${BUILD} -vv -p ${PORT} -l ${HOST} -D ./${BUILD_DIR}/

start: build
	@(test ! -f ./bin/redbean.pid && \
		${BUILD} -vv -d -L ${LOG_FILE} -P ${PID_FILE} -p ${PORT} -l ${HOST} -D ./${BUILD_DIR}/ \
	|| echo "Redbean is already running at $$(cat ${PID_FILE})")

stop:
	@(test -f ${PID_FILE} && \
		kill -TERM $$(cat ${PID_FILE}) && \
		rm ${PID_FILE} \
	|| true)

restart: stop build start

watch:
	make stop
	make start && \
	trap 'make stop' EXIT INT TERM && \
	watchexec -p -w src -w frontend make restart

logs:
	tail -f ${LOG_FILE}

clean:
	rm -f ${REDBEAN}
	rm -f ${ASSIMILATE}
	rm -f ${BUILD}
	rm -f ${LOG_FILE}
	rm -f ${PID_FILE}
	rm -rf ${DATA_DIR}

