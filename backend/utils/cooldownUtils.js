// Verify if enough cooldown time has elapsed since the last email attempt
const checkEmailCooldown = (lastAttemptAt, cooldownSeconds = 5) => {
  if (!lastAttemptAt) {
    return { isRateLimited: false, remainingSeconds: 0 };
  }

  const elapsedSeconds = Math.floor((Date.now() - new Date(lastAttemptAt).getTime()) / 1000);
  if (elapsedSeconds < cooldownSeconds) {
    const remainingSeconds = cooldownSeconds - elapsedSeconds;
    return {
      isRateLimited: true,
      remainingSeconds,
      message: `Please wait ${remainingSeconds} second(s) before retrying email dispatch.`
    };
  }

  return { isRateLimited: false, remainingSeconds: 0 };
};

module.exports = { checkEmailCooldown };
