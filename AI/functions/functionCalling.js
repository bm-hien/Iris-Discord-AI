const moderationFunctions = [
  {
    name: "moderate_member",
    description: "Thực hiện các hành động kiểm duyệt với thành viên trong Discord server",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["mute", "unmute", "kick", "ban"],
          description: "Hành động cần thực hiện với thành viên"
        },
        user_id: {
          type: "string",
          description: "ID của thành viên mục tiêu (mention như <@123456> hoặc username)"
        },
        duration: {
          type: "string",
          description: "Thời gian cho mute/ban (VD: 30s, 10m, 1h, 1d). Bỏ trống nếu không cần"
        },
        reason: {
          type: "string",
          description: "Lý do thực hiện hành động kiểm duyệt"
        }
      },
      required: ["action", "user_id"]
    }
  },
  {
    name: "clear_messages",
    description: "Xóa một số lượng tin nhắn trong channel hiện tại",
    parameters: {
      type: "object",
      properties: {
        amount: {
          type: "integer",
          minimum: 1,
          maximum: 100,
          description: "Số lượng tin nhắn cần xóa (từ 1 đến 100)"
        },
        reason: {
          type: "string",
          description: "Lý do xóa tin nhắn"
        }
      },
      required: ["amount"]
    }
  },
  {
    name: "lock_channel",
    description: "Khóa channel hiện tại hoặc channel cụ thể theo ID, không cho phép thành viên gửi tin nhắn",
    parameters: {
      type: "object",
      properties: {
        channel_id: {
          type: "string",
          description: "ID của channel cần khóa (không bắt buộc - nếu không có sẽ khóa channel hiện tại)"
        }
      },
      required: []
    }
  },
  {
    name: "unlock_channel", 
    description: "Mở khóa channel hiện tại hoặc channel cụ thể theo ID, cho phép thành viên gửi tin nhắn trở lại",
    parameters: {
      type: "object",
      properties: {
        channel_id: {
          type: "string",
          description: "ID của channel cần mở khóa (không bắt buộc - nếu không có sẽ mở khóa channel hiện tại)"
        }
      },
      required: []
    }
  }
];

// Helper function to convert function calls to legacy command format
function convertFunctionCallToCommand(functionCall) {
  const { name, arguments: args } = functionCall;
  
  switch (name) {
    case "moderate_member":
      return {
        function: args.action,
        target: args.user_id,
        reason: args.reason,
        duration: args.duration
      };
    
    case "clear_messages":
      return {
        function: "clear",
        target: args.amount.toString(),
        reason: args.reason
      };
      
    case "lock_channel":
      return {
        function: "lock",
        channel_id: args.channel_id
      };
      
    case "unlock_channel":
      return {
        function: "unlock",
        channel_id: args.channel_id
      };
    
    default:
      return null;
  }
}

module.exports = {
  moderationFunctions,
  convertFunctionCallToCommand
};