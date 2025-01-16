const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;

// OAuth2 클라이언트 설정
const oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

// 이메일 템플릿 생성 함수
const createEmailTemplate = (type, data) => {
  switch (type) {
    case 'verification':
      return `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #333; text-align: center;">이메일 인증</h2>
          <p style="color: #666; line-height: 1.6;">안녕하세요!</p>
          <p style="color: #666; line-height: 1.6;">아래 버튼을 클릭하여 이메일 인증을 완료해주세요.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.verificationLink}" 
               style="background-color: #4CAF50; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 4px; display: inline-block;">
              이메일 인증하기
            </a>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center;">
            이 링크는 24시간 동안 유효합니다.
          </p>
        </div>
      `;

    case 'reset-password':
      return `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #333; text-align: center;">비밀번호 재설정</h2>
          <p style="color: #666; line-height: 1.6;">안녕하세요!</p>
          <p style="color: #666; line-height: 1.6;">아래 버튼을 클릭하여 비밀번호를 재설정해주세요.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.resetLink}" 
               style="background-color: #4CAF50; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 4px; display: inline-block;">
              비밀번호 재설정하기
            </a>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center;">
            이 링크는 1시간 동안 유효합니다.
          </p>
        </div>
      `;

    default:
      return '';
  }
};

// 이메일 전송 함수
const sendEmail = async (to, subject, html) => {
  try {
    const accessToken = await oauth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
        accessToken: accessToken.token
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html
    });
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

// 이메일 인증 메일 전송
exports.sendVerificationEmail = async (email, token) => {
  const verificationLink = `${process.env.BASE_URL}/auth/verify-email/${token}`;
  await sendEmail(
    email,
    '이메일 인증을 완료해주세요',
    'verification',
    { verificationLink }
  );
};

// 비밀번호 재설정 메일 전송
exports.sendPasswordResetEmail = async (email, code) => {
    const template = `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <h2 style="color: #333; text-align: center;">비밀번호 재설정</h2>
            <p style="color: #666; line-height: 1.6;">안녕하세요!</p>
            <p style="color: #666; line-height: 1.6;">비밀번호 재설정을 위한 인증코드입니다:</p>
            <div style="text-align: center; margin: 30px 0;">
                <div style="background-color: #f5f5f5; padding: 15px; 
                            font-size: 24px; letter-spacing: 5px; 
                            border-radius: 4px; display: inline-block;">
                    ${code}
                </div>
            </div>
            <p style="color: #999; font-size: 12px; text-align: center;">
                이 인증코드는 1시간 동안 유효합니다.
            </p>
        </div>
    `;

    console.log('Generated verification code:', code);

    await sendEmail(
        email,
        '비밀번호 재설정 인증코드',
        template
    );
};

module.exports = exports; 