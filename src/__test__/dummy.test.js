import { getPost } from '../controllers/posts.js'
// import * as mockPostMessage from '../models/postMessage.js';

jest.mock('../models/postMessage.js', () => ({
    findById: jest.fn().mockReturnValue({})
}))

describe("Dummy test", () => {
    it("Should pass", async () => {
        const fakeReq = {
            params: {
                id: "fakeid"
            }
        };
        const fakeRes = {
            status: jest.fn().mockReturnValue({
                json: jest.fn()
            })
        };
        const output = await getPost(fakeReq, fakeRes);
        expect(output).toBe({});
    });
});