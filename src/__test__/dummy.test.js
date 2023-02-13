import { getPost } from '../controllers/posts.js'

describe("Dummy test", () => {
    it("Should pass", async () => {
        await getPost();
        expect(true).toBeTruthy();
    });
});