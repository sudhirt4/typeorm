import "reflect-metadata"
import { expect } from "chai"
import sinon from "sinon"

import {
    createTestingConnections,
    closeTestingConnections,
    reloadTestingDatabases,
} from "../../utils/test-utils"
import { DataSource, MssqlParameter } from "../../../src/index.js"
import { SqlServerQueryRunner } from "../../../src/driver/sqlserver/SqlServerQueryRunner"
import { User } from "./entity/user"

describe("github issues > #11285 Missing MSSQL input type", () => {
    describe("mssql connection", () => {
        let dataSources: DataSource[]
        before(
            async () =>
                (dataSources = await createTestingConnections({
                    entities: [User],
                    enabledDrivers: ["mssql"],
                    schemaCreate: true,
                    dropSchema: true,
                })),
        )

        beforeEach(() => reloadTestingDatabases(dataSources))
        after(() => closeTestingConnections(dataSources))

        it("should convert input parameter to MssqlParameter", () =>
            Promise.all(
                dataSources.map(async (dataSource) => {
                    const user = new User()
                    user.memberId = "test-member-id"

                    await dataSource.manager.save([user])

                    const selectSpy = sinon.spy(
                        SqlServerQueryRunner.prototype,
                        "query",
                    )

                    const users = await dataSource.getRepository(User).find({
                        where: {
                            memberId: user.memberId,
                        },
                    })

                    expect(users).to.have.length(1)
                    expect(selectSpy.calledOnce).to.be.true

                    sinon.assert.calledWithMatch(
                        selectSpy,
                        sinon.match.any,
                        sinon.match((value) => {
                            return (
                                Array.isArray(value) &&
                                value.length === 1 &&
                                value[0] instanceof MssqlParameter &&
                                value[0].value === "test-member-id" &&
                                value[0].type === "varchar"
                            )
                        }),
                    )
                }),
            ))
    })


    describe("other connections", () => {
        let dataSources: DataSource[]
        before(
            async () =>
                (dataSources = await createTestingConnections({
                    entities: [User],
                    enabledDrivers: ["postgres"],
                    schemaCreate: true,
                    dropSchema: true,
                })),
        )

        beforeEach(() => reloadTestingDatabases(dataSources))
        after(() => closeTestingConnections(dataSources))

        it("should used the input parameter as it is", () =>
            Promise.all(
                dataSources.map(async (dataSource) => {
                    const user = new User()
                    user.memberId = "test-member-id"

                    await dataSource.manager.save([user])

                    const selectSpy = sinon.spy(
                        SqlServerQueryRunner.prototype,
                        "query",
                    )

                    const users = await dataSource.getRepository(User).find({
                        where: {
                            memberId: user.memberId,
                        },
                    })

                    expect(users).to.have.length(1)
                    expect(selectSpy.calledOnce).to.be.true

                    sinon.assert.calledWithMatch(
                        selectSpy,
                        sinon.match.any,
                        sinon.match((value) => {
                            return (
                                value[0] === user.memberId
                            )
                        }),
                    )
                }),
            ))
    })
})
