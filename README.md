# Tuktuk Fanout

Tuktuk Fanout is a tool for creating a wallet that splits incoming SPL tokens amongst multiple wallets. You can run the UI from packages/fanout-ui.

## Running the UI

Make sure to create a `.env` file in the root of the project with the following:

```bash
NEXT_PUBLIC_SOLANA_URL=https://api.devnet.solana.com
```

Then run the UI with:

```bash
cd packages/fanout-ui
yarn install
yarn dev
```

## Legal Disclaimer and Terms of Use:

Important Disclaimers and Terms of Use:

  * Scope of Fanout: Please be aware that when you activate a fanout distribution, it will apply to all types of tokens and assets currently held in this wallet and all future tokens and assets deposited into this wallet, without exception, until you modify or deactivate the fanout settings. You will need to manually enable fanout for each new token or asset, however there is no way to withdraw those assets without enabling the fanout.
  * Duration of Fanout: The fanout distribution you establish will remain active and will continuously distribute assets according to your set formula until you affirmatively change or disable the fanout settings within the wallet application. It is your responsibility to manage and update these settings.
  * Irreversibility of Transactions: Once assets are distributed from your wallet to other recipient addresses according to your fanout settings, these transactions are final and irreversible. Nova Labs, Inc. cannot retrieve, recall, or reverse any assets that have been transferred.
  * Accuracy of Recipient Addresses: You are solely responsible for ensuring the accuracy of the recipient wallet addresses you provide for the fanout distribution. Transactions sent to incorrect or unintended addresses due to your error cannot be reversed or recovered. Double-check all addresses before confirming your fanout settings.
  * No Control by Nova Labs: Nova Labs, Inc. does not control and is not responsible for the private keys of your wallet or the recipient wallets. We do not have the ability to access, freeze, or manage funds in any wallet, including those involved in a fanout distribution. You are in sole control of your wallet and the fanout configurations.
  * Tax Implications: You are solely responsible for understanding and complying with any and all tax obligations that may arise from the distribution of assets through the fanout feature. Distributions may be considered taxable events depending on your jurisdiction and the nature of the assets. Nova Labs, Inc. does not provide tax advice.
  * Compliance with Laws; Acceptable Use: You agree to use the fanout feature in strict compliance with all applicable local, state, federal, and international laws, regulations, and sanctions programs. This includes, but is not limited to, laws concerning financial services, securities, anti-money laundering, counter-terrorist financing, and export controls. You shall not use the fanout feature for any unlawful purpose, including but not limited to, distributing illicit proceeds or engaging in transactions that violate applicable laws. Nova Labs, Inc. reserves the right to restrict or terminate access to this feature if it suspects, in its sole discretion, any violation of applicable law or these terms.
  * Potential Securities Regulations: You acknowledge that certain digital assets or distribution schemes facilitated through the fanout feature may be subject to securities laws in various jurisdictions. It is your sole responsibility to ensure that your use of the fanout feature, including the nature of the assets distributed and the manner of their distribution, does not violate any applicable securities laws or regulations. Nova Labs, Inc. makes no representations or warranties regarding the legal classification or treatment of any assets distributed via this feature.
  * Technology Risks (including Smart Contract Risks, if applicable): You understand that the fanout feature relies on complex software and network protocols (which may include smart contracts). While Nova Labs, Inc. endeavors to ensure the security and functionality of its software, all software and underlying network technologies (such as blockchains or smart contracts) carry inherent risks, including but not limited to, vulnerabilities, bugs, exploits, or network failures that could result in the unintended behavior of the fanout feature or loss of assets. Nova Labs, Inc. is not responsible for losses resulting from such inherent technology risks.
  * No Endorsement or Guarantee: The fanout feature is provided "as-is" and "as-available" without any warranties of any kind, express or implied. Nova Labs, Inc. does not endorse any particular asset, recipient, or use of the fanout feature and does not guarantee the continuous, uninterrupted, or error-free operation of this feature.