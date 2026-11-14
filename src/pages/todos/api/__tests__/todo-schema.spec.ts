import { describe, expect, it } from "vite-plus/test";

import {
  createTodoInputSchema,
  deleteTodoInputSchema,
  updateTodoInputSchema,
  uploadTodoImageInputSchema,
} from "../todo-schema";

describe("create todo input schema valid inputs", () => {
  it("parses valid input and trims title", () => {
    expect.assertions(3);

    // Arrange
    const rawInput = {
      description: "Paperwork",
      imageKey: "temp/user-1/pic.webp",
      title: "  Clean desk  ",
    };

    // Act
    const parsed = createTodoInputSchema.parse(rawInput);

    // Assert
    expect(parsed.title).toBe("Clean desk");
    expect(parsed.description).toBe("Paperwork");
    expect(parsed.imageKey).toBe("temp/user-1/pic.webp");
  });

  it("parses valid input with null description and null imageKey", () => {
    expect.assertions(3);

    // Arrange
    const rawInput = { description: null, imageKey: null, title: "Buy milk" };

    // Act
    const parsed = createTodoInputSchema.parse(rawInput);

    // Assert
    expect(parsed.title).toBe("Buy milk");
    expect(parsed.description).toBeNull();
    expect(parsed.imageKey).toBeNull();
  });
});

describe("create todo input schema invalid inputs", () => {
  it("throws when title is empty", () => {
    expect.assertions(1);

    // Arrange
    const invalidInput = { title: "" };

    // Act
    function parse() {
      createTodoInputSchema.parse(invalidInput);
    }

    // Assert
    expect(parse).toThrow("Title is required");
  });

  it("throws when title is only whitespace", () => {
    expect.assertions(1);

    // Arrange
    const invalidInput = { title: "   " };

    // Act
    function parse() {
      createTodoInputSchema.parse(invalidInput);
    }

    // Assert
    expect(parse).toThrow("Title is required");
  });

  it("throws when description exceeds 1024 characters", () => {
    expect.assertions(1);

    // Arrange
    const invalidInput = { description: "a".repeat(1025), title: "Valid title" };

    // Act
    function parse() {
      createTodoInputSchema.parse(invalidInput);
    }

    // Assert
    expect(parse).toThrow("Description must not exceed 1024 characters");
  });
});

describe("update todo input schema valid inputs", () => {
  it("parses valid update input with all fields provided", () => {
    expect.assertions(5);

    // Arrange
    const rawInput = {
      data: {
        completed: true,
        description: "New desc",
        imageKey: "todos/todo-1/pic.webp",
        title: "  New title  ",
      },
      id: "todo-1",
    };

    // Act
    const parsed = updateTodoInputSchema.parse(rawInput);

    // Assert
    expect(parsed.id).toBe("todo-1");
    expect(parsed.data.title).toBe("New title");
    expect(parsed.data.description).toBe("New desc");
    expect(parsed.data.completed).toBe(true);
    expect(parsed.data.imageKey).toBe("todos/todo-1/pic.webp");
  });

  it("parses valid update input with empty data", () => {
    expect.assertions(5);

    // Arrange
    const rawInput = { data: {}, id: "todo-1" };

    // Act
    const parsed = updateTodoInputSchema.parse(rawInput);

    // Assert
    expect(parsed.id).toBe("todo-1");
    expect(parsed.data.title).toBeUndefined();
    expect(parsed.data.description).toBeUndefined();
    expect(parsed.data.completed).toBeUndefined();
    expect(parsed.data.imageKey).toBeUndefined();
  });
});

describe("update todo input schema toggle completed", () => {
  it("parses valid toggle update input", () => {
    expect.assertions(2);

    // Arrange
    const rawInput = { data: { completed: true }, id: "todo-1" };

    // Act
    const parsed = updateTodoInputSchema.parse(rawInput);

    // Assert
    expect(parsed.id).toBe("todo-1");
    expect(parsed.data.completed).toBe(true);
  });
});

describe("update todo input schema invalid inputs", () => {
  it("throws when id is empty", () => {
    expect.assertions(1);

    // Arrange
    const invalidInput = { data: {}, id: "" };

    // Act
    function parse() {
      updateTodoInputSchema.parse(invalidInput);
    }

    // Assert
    expect(parse).toThrow(/too_small/iu);
  });

  it("throws when title is empty string", () => {
    expect.assertions(1);

    // Arrange
    const invalidInput = { data: { title: "" }, id: "todo-1" };

    // Act
    function parse() {
      updateTodoInputSchema.parse(invalidInput);
    }

    // Assert
    expect(parse).toThrow(/too_small/iu);
  });

  it("throws when completed is invalid", () => {
    expect.assertions(1);

    // Arrange
    const invalidInput = { data: { completed: "yes" }, id: "todo-1" };

    // Act
    function parse() {
      updateTodoInputSchema.parse(invalidInput);
    }

    // Assert
    expect(parse).toThrow(/invalid_type/iu);
  });
});

describe("delete todo input schema", () => {
  it("parses valid delete input", () => {
    expect.assertions(1);

    // Arrange
    const rawInput = { id: "todo-1" };

    // Act
    const parsed = deleteTodoInputSchema.parse(rawInput);

    // Assert
    expect(parsed.id).toBe("todo-1");
  });

  it("throws a validation error when id is empty", () => {
    expect.assertions(1);

    // Arrange
    const invalidInput = { id: "" };

    // Act
    function parse() {
      deleteTodoInputSchema.parse(invalidInput);
    }

    // Assert
    expect(parse).toThrow(/too_small/iu);
  });
});

describe("upload todo image input schema", () => {
  it("parses valid upload input and defaults contentType", () => {
    expect.assertions(2);

    // Arrange
    const rawInput = { base64: "data:image/webp;base64,AAAA" };

    // Act
    const parsed = uploadTodoImageInputSchema.parse(rawInput);

    // Assert
    expect(parsed.base64).toBe("data:image/webp;base64,AAAA");
    expect(parsed.contentType).toBe("image/webp");
  });

  it("throws when base64 is empty", () => {
    expect.assertions(1);

    // Arrange
    const invalidInput = { base64: "" };

    // Act
    function parse() {
      uploadTodoImageInputSchema.parse(invalidInput);
    }

    // Assert
    expect(parse).toThrow("Image data is required");
  });
});
